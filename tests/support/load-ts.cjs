const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

// Charge les modules TypeScript de src/ dans node:test : transpilation à la volée et résolution de
// l'alias `@/*` de tsconfig (sans quoi les routes Next.js, qui l'utilisent, ne se chargent pas).

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  resolveJsonModule: true,
  jsx: ts.JsxEmit.ReactJSX,
  // Avec --enable-source-maps, la couverture est rapportée sur les lignes du TypeScript d'origine.
  inlineSourceMap: true,
  inlineSources: true,
};

let installed = false;

function install() {
  if (installed) return;
  installed = true;
  const compile = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions, fileName: filename }).outputText, filename);
  require.extensions['.ts'] = compile;
  require.extensions['.tsx'] = compile;
  const resolveFilename = Module._resolveFilename;
  Module._resolveFilename = function resolveAlias(request, ...rest) {
    return resolveFilename.call(this, request.startsWith('@/') ? path.join(SRC, request.slice(2)) : request, ...rest);
  };
}

/** `requireSrc('lib/bff-proxy.ts')` : charge un module de src/ (chemin relatif à src/). */
function requireSrc(relativePath) {
  install();
  return require(path.join(SRC, relativePath));
}

module.exports = { ROOT, SRC, install, requireSrc };
