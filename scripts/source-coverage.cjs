const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { fileURLToPath } = require('node:url');
const { createRequire } = require('node:module');
const { classifySource, normalizeNonExecutableCoverage } = require('./coverage-source-kind.cjs');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function sourcesIn(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourcesIn(filename));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.(tsx?|jsx)$/.test(entry.name)) files.push(filename);
  }
  return files.sort();
}

async function verifySourceSnapshot(root, sourceHashes, includeDeclarations = true) {
  const paths = (await sourcesIn(path.join(root, 'src'))).filter(filename => includeDeclarations || !filename.endsWith('.d.ts'));
  const current = new Map(paths.map(filename => [path.relative(root, filename).split(path.sep).join('/'), filename]));
  const failures = [];
  for (const relative of Object.keys(sourceHashes)) if (!current.has(relative)) failures.push({ file: relative, metric: 'presence', actual: 'source removed during reporting', required: 'unchanged source inventory' });
  for (const [relative, filename] of current) {
    if (!(relative in sourceHashes)) failures.push({ file: relative, metric: 'presence', actual: 'source added during reporting', required: 'unchanged source inventory' });
    else if (sha256(await fs.readFile(filename)) !== sourceHashes[relative]) failures.push({ file: relative, metric: 'source integrity', actual: 'source changed while reporting', required: 'identical source' });
  }
  return failures;
}

function indexCapturedSourceMaps(captured) {
  return new Map(Object.entries(captured['source-map-cache'] ?? {})
    .filter(([url]) => url.startsWith('file:'))
    .map(([url, entry]) => [fileURLToPath(url), entry]));
}

function evaluateCoverage(map, root, sourcePaths, scope) {
  if (scope.componentEnvironment !== undefined && !['node', 'vitest'].includes(scope.componentEnvironment)) throw new Error('Unknown coverage environment.');
  const nodeOnly = scope.componentEnvironment === 'node';
  if (nodeOnly && (scope.reactSources.length || scope.serverTsxSources.length)) throw new Error('Node-only coverage cannot exempt sources or assign another environment.');
  const nodeMap = new map.constructor();
  const nodeOwns = relative => nodeOnly || relative.endsWith('.ts') && !scope.reactSources.includes(relative);
  for (const filename of map.files()) {
    const relative = path.relative(root, filename).split(path.sep).join('/');
    if (nodeOwns(relative)) nodeMap.addFileCoverage(map.fileCoverageFor(filename));
  }
  const total = nodeMap.getCoverageSummary().toJSON();
  const files = {};
  for (const filename of map.files()) files[path.relative(root, filename).split(path.sep).join('/')] = map.fileCoverageFor(filename).toSummary().toJSON();
  const failures = [];
  const inventoried = new Set(sourcePaths.map(filename => path.resolve(filename)));
  for (const filename of map.files()) if (!inventoried.has(path.resolve(filename))) failures.push({ file: path.relative(root, filename).split(path.sep).join('/'), metric: 'presence', actual: 'outside source inventory', required: 'inventoried source' });
  for (const metric of ['lines', 'branches', 'functions']) if (total[metric].pct < 60) failures.push({ file: 'all Node-owned source', metric, actual: total[metric].pct, required: 60 });
  for (const filename of sourcePaths) {
    const relative = path.relative(root, filename).split(path.sep).join('/');
    if (!files[relative]) failures.push({ file: relative, metric: 'presence', actual: 'missing', required: 'reported' });
    else if (nodeOwns(relative) && files[relative].lines.pct < 60) failures.push({ file: relative, metric: 'lines', actual: files[relative].lines.pct, required: 60 });
  }
  return { total, files, failures };
}

async function sourceCoverage({ root = process.cwd(), rawDirectory, reportDirectory, c8Factory, c8Version, nativeReport = 'coverage/lcov.info' } = {}) {
  root = path.resolve(root);
  if (root !== process.cwd()) throw new Error('Run coverage from the application root so c8 resolves the source scope consistently.');
  rawDirectory = path.resolve(root, rawDirectory ?? 'coverage/native-v8/raw');
  reportDirectory = path.resolve(root, reportDirectory ?? 'coverage/source-mapped');
  if (rawDirectory === reportDirectory) throw new Error('Raw coverage and source reports must use distinct directories.');
  const rawFiles = (await fs.readdir(rawDirectory)).filter(name => /^coverage-.*\.json$/.test(name)).sort();
  if (!rawFiles.length) throw new Error('No captured V8 coverage files were found.');
  const scope = require('./coverage-scope.cjs');
  const nodeOnly = scope.componentEnvironment === 'node';
  const sourcePaths = (await sourcesIn(path.join(root, 'src'))).filter(filename => nodeOnly || !filename.endsWith('.d.ts'));
  // Classification and fingerprint attest the exact same read, including non-executable declarations.
  const capturedSources = await Promise.all(sourcePaths.map(async filename => ({ filename, bytes: await fs.readFile(filename) })));
  const classifications = nodeOnly ? Object.fromEntries(capturedSources.map(({ filename, bytes }) => [filename, classifySource(filename, bytes.toString('utf8'))])) : {};
  const sourceHashes = Object.fromEntries(capturedSources.map(({ filename, bytes }) => [path.relative(root, filename).split(path.sep).join('/'), sha256(bytes)]));
  const inputs = [];
  const sourceMaps = [];
  const mismatches = [];
  const missingMaps = [];
  for (const name of rawFiles) {
    const bytes = await fs.readFile(path.join(rawDirectory, name));
    const captured = JSON.parse(bytes);
    if (!Array.isArray(captured.result)) throw new Error(`Invalid V8 capture: ${name}`);
    inputs.push({ name, sha256: sha256(bytes) });
    const capturedMaps = indexCapturedSourceMaps(captured);
    for (const script of captured.result) {
      if (!script.url?.startsWith('file:')) continue;
      const relative = path.relative(root, fileURLToPath(script.url)).split(path.sep).join('/');
      if (relative in sourceHashes && !capturedMaps.get(fileURLToPath(script.url))?.data) missingMaps.push({ capture: name, source: relative });
    }
    for (const [url, entry] of Object.entries(captured['source-map-cache'] ?? {})) {
      if (!url.startsWith('file:')) continue;
      const filename = fileURLToPath(url);
      const relative = path.relative(root, filename).split(path.sep).join('/');
      if (!(relative in sourceHashes) || !entry.data) continue;
      sourceMaps.push({ capture: name, url: relative, sha256: sha256(JSON.stringify(entry.data)), lineLengthsSha256: sha256(JSON.stringify(entry.lineLengths)) });
      for (let index = 0; index < (entry.data.sources ?? []).length; index++) {
        const sourceUrl = new URL(entry.data.sources[index], url);
        if (sourceUrl.protocol !== 'file:') continue;
        const sourceRelative = path.relative(root, fileURLToPath(sourceUrl)).split(path.sep).join('/');
        const embedded = entry.data.sourcesContent?.[index];
        if (sourceRelative in sourceHashes && (typeof embedded !== 'string' || sha256(embedded) !== sourceHashes[sourceRelative])) mismatches.push({ capture: name, source: sourceRelative });
      }
    }
  }
  let captureRun;
  try {
    const filename = path.join(path.dirname(rawDirectory), 'run.json');
    const bytes = await fs.readFile(filename);
    captureRun = { path: filename, sha256: sha256(bytes), result: JSON.parse(bytes) };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const reportFactory = c8Factory ?? require('c8').Report;
  const version = c8Version ?? require('c8/package.json').version;
  const report = reportFactory({
    include: ['src/**/*.{ts,tsx}'], exclude: ['**/*.test.ts', '**/*.test.tsx'], extension: ['.ts', '.tsx'], all: true, src: [path.join(root, 'src')],
    reporter: ['text', 'lcov', 'json', 'json-summary'], reportsDirectory: reportDirectory,
    tempDirectory: rawDirectory, excludeAfterRemap: true, excludeNodeModules: true,
    allowExternal: false, skipFull: false, mergeAsync: true,
  });
  await report.run();
  let map = await report.getCoverageMapFromAllCoverageFiles();
  let nonExecutableNormalization;
  if (Object.values(classifications).some(source => !source.executable)) {
    // Preserve every original c8 artifact before reporting the AST-confirmed zero runtime body.
    const rawReportDirectory = path.join(reportDirectory, 'c8-raw');
    await fs.mkdir(rawReportDirectory, { recursive: true });
    const rawReports = {};
    for (const name of ['lcov.info', 'coverage-final.json', 'coverage-summary.json', 'lcov-report']) {
      await fs.cp(path.join(reportDirectory, name), path.join(rawReportDirectory, name), { recursive: true });
      if (name !== 'lcov-report') {
        const originalHash = sha256(await fs.readFile(path.join(reportDirectory, name)));
        const archivedHash = sha256(await fs.readFile(path.join(rawReportDirectory, name)));
        if (originalHash !== archivedHash) throw new Error(`Raw c8 report changed while archiving: ${name}`);
        rawReports[name] = { sha256: originalHash, byteIdenticalArchive: true };
      }
    }
    map = normalizeNonExecutableCoverage(map, classifications);
    const requireC8 = createRequire(require.resolve('c8/package.json'));
    const context = requireC8('istanbul-lib-report').createContext({ dir: reportDirectory, coverageMap: map });
    for (const reporter of ['lcov', 'json', 'json-summary']) requireC8('istanbul-reports').create(reporter, { skipEmpty: false }).execute(context);
    nonExecutableNormalization = { classifier: { tool: 'typescript', version: require('typescript/package.json').version, policy: 'strict erased-type AST allowlist; parse errors fail closed' }, tool: 'istanbul-lib-coverage / istanbul-reports', rawReportDirectory, rawReports, sources: Object.fromEntries(Object.entries(classifications).filter(([, source]) => !source.executable).map(([filename, classification]) => [path.relative(root, filename).split(path.sep).join('/'), { ...classification, coverageApplicability: 'N/A', sha256: sourceHashes[path.relative(root, filename).split(path.sep).join('/')], counters: { lines: 0, functions: 0, branches: 0 } }])) };
  }
  const { total, files, failures } = evaluateCoverage(map, root, sourcePaths, scope);
  for (const [filename, classification] of Object.entries(classifications)) if (!classification.executable) files[path.relative(root, filename).split(path.sep).join('/')].coverageApplicability = 'N/A';
  failures.push(...await verifySourceSnapshot(root, sourceHashes, nodeOnly));
  for (const missing of missingMaps) failures.push({ file: missing.source, metric: 'source map', actual: 'missing from capture', required: 'captured inline source map' });
  for (const mismatch of mismatches) failures.push({ file: mismatch.source, metric: 'source integrity', actual: 'capture differs from current source', required: 'identical source' });
  const provenance = { node: process.version, tool: 'c8', version, root, rawDirectory, reportDirectory, scope: 'All src/**/*.{ts,tsx} modules are measured by Node/c8; global lines/branches/functions and per-file lines retain the 60% gate without a source exception.', nativeReport: { path: nativeReport, sha256: sha256(await fs.readFile(path.resolve(root, nativeReport))) }, captureRun, environmentOwnership: scope, nonExecutableNormalization, declarations: Object.fromEntries(Object.entries(classifications).filter(([, source]) => source.kind === 'declaration').map(([filename]) => { const relative = path.relative(root, filename).split(path.sep).join('/'); return [relative, sourceHashes[relative]]; })), inputs, sources: sourceHashes, sourceMaps, total, files, failures };
  await fs.writeFile(path.join(reportDirectory, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  return provenance;
}

module.exports = { sourceCoverage, indexCapturedSourceMaps, evaluateCoverage, verifySourceSnapshot };
if (require.main === module) {
  sourceCoverage({ rawDirectory: process.argv[2], reportDirectory: process.argv[3] }).then(result => {
    for (const failure of result.failures) console.error(`${failure.file}: ${failure.metric} ${failure.actual}; required ${failure.required}`);
    if (result.failures.length) process.exitCode = 1;
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
