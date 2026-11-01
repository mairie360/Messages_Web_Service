const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createCoverageMap } = createRequire(require.resolve('c8/package.json'))('istanbul-lib-coverage');
const { evaluateCoverage } = require('../scripts/source-coverage.cjs');
const root = '/fixture';
const sources = ['src/server.ts', 'src/view.tsx'].map(file => path.join(root, file));
// These instrumenter records are policy fixtures, not application coverage evidence.
function report() {
  const map = createCoverageMap({});
  for (const [file, count] of [['src/server.ts', 1], ['src/view.tsx', 0]]) map.addFileCoverage({ path: path.join(root, file), statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } } }, s: { 0: count }, fnMap: {}, f: {}, branchMap: {}, b: {} });
  return map;
}
test('Node-only ownership retains and rejects a genuinely uncovered TSX record', () => {
  const result = evaluateCoverage(report(), root, sources, { componentEnvironment: 'node', reactSources: [], serverTsxSources: [] });
  assert.equal(result.total.lines.pct, 50);
  assert.equal(result.files['src/view.tsx'].lines.pct, 0);
  assert.ok(result.failures.some(f => f.file === 'src/view.tsx' && f.required === 60));
  assert.ok(result.failures.some(f => f.file === 'all Node-owned source' && f.metric === 'lines'));
});
test('Vitest ownership defers the import-only TSX score while preserving its record', () => {
  const result = evaluateCoverage(report(), root, sources, { reactSources: [], serverTsxSources: [] });
  assert.equal(result.total.lines.pct, 100);
  assert.equal(result.files['src/view.tsx'].lines.pct, 0);
  assert.deepEqual(result.failures, []);
});
test('Node-only ownership rejects attempts to exempt a source or hand it to another environment', () => {
  for (const scope of [{ componentEnvironment: 'node', reactSources: ['src/server.ts'], serverTsxSources: [] }, { componentEnvironment: 'node', reactSources: [], serverTsxSources: ['src/view.tsx'] }]) assert.throws(() => evaluateCoverage(report(), root, sources, scope), /Node-only/);
});

const { normalizeNonExecutableCoverage } = require('../scripts/coverage-source-kind.cjs');
test('zero-runtime normalization preserves the raw record and every uncovered executable counter', () => {
  const raw = report();
  const view = path.join(root, 'src/view.tsx');
  const server = path.join(root, 'src/server.ts');
  const result = normalizeNonExecutableCoverage(raw, { [server]: { executable: false }, [view]: { executable: true } });
  assert.equal(raw.fileCoverageFor(server).toSummary().lines.total, 1);
  assert.equal(result.fileCoverageFor(server).toSummary().lines.total, 0);
  assert.equal(result.fileCoverageFor(server).toSummary().functions.total, 0);
  assert.equal(result.fileCoverageFor(server).toSummary().branches.total, 0);
  assert.equal(result.fileCoverageFor(view).toSummary().lines.pct, 0);
  assert.equal(evaluateCoverage(result, root, sources, { componentEnvironment: 'node', reactSources: [], serverTsxSources: [] }).failures.some(f => f.file === 'src/view.tsx'), true);
  assert.throws(() => normalizeNonExecutableCoverage(raw, { '/fixture/missing.ts': { executable: false } }), /missing from c8/);
});

test('a report entry outside the complete source inventory fails closed', () => {
  const result = evaluateCoverage(report(), root, [sources[0]], { componentEnvironment: 'node', reactSources: [], serverTsxSources: [] });
  assert.ok(result.failures.some(f => f.file === 'src/view.tsx' && f.metric === 'presence'));
});

test('official LCOV reports type-only syntax as zero executable counters and preserves an uncovered runtime body', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const requireC8 = createRequire(require.resolve('c8/package.json'));
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'coverage-type-only-'));
  try {
    const map = normalizeNonExecutableCoverage(report(), { [sources[0]]: { executable: false } });
    const context = requireC8('istanbul-lib-report').createContext({ dir: directory, coverageMap: map });
    requireC8('istanbul-reports').create('lcovonly').execute(context);
    const records = (await fs.readFile(path.join(directory, 'lcov.info'), 'utf8')).split('end_of_record');
    const types = records.find(record => record.includes('src/server.ts'));
    for (const field of ['LF', 'LH', 'FNF', 'FNH', 'BRF', 'BRH']) assert.match(types, new RegExp(`(?:^|\n)${field}:0(?:\n|$)`));
    const executable = records.find(record => record.includes('src/view.tsx'));
    assert.match(executable, /LF:1/);
    assert.match(executable, /LH:0/);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
