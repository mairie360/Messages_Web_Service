const ts = require('typescript');

function classifySource(filename, source) {
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (parsed.parseDiagnostics.length) throw new Error(`Cannot classify invalid TypeScript source: ${filename}`);
  const erased = statement => ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly === true || ts.isExportDeclaration(statement) && statement.isTypeOnly === true;
  if (filename.endsWith('.d.ts')) {
    if (!parsed.statements.every(erased)) throw new Error(`Declaration source needs an explicit non-runtime classification: ${filename}`);
    return { kind: 'declaration', executable: false, reason: 'Declaration file containing only erased type statements; no emitted runtime body.' };
  }
  if (parsed.statements.every(erased)) return { kind: 'type-only', executable: false, reason: 'Every top-level statement is an erased type declaration, type import or type export.' };
  return { kind: 'runtime', executable: true };
}

function normalizeNonExecutableCoverage(map, classifications) {
  const data = Object.fromEntries(map.files().map(filename => [filename, structuredClone(map.fileCoverageFor(filename).toJSON())]));
  for (const [filename, classification] of Object.entries(classifications)) {
    if (classification.executable) continue;
    if (!data[filename]) throw new Error(`Non-executable source is missing from c8 coverage: ${filename}`);
    // Zero counters represent erased syntax, never executed statements or an invented 100% hit.
    data[filename] = { path: filename, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {} };
  }
  return new map.constructor(data);
}

module.exports = { classifySource, normalizeNonExecutableCoverage };
