const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// Le contrat du front est celui de BFF Message publié dans @mairie360/bff-message-openapi, épinglé à une version
// exacte X.Y.Z : contracts/openapi.json doit en être la reconstruction exacte (scripts/orval-contract.mjs), et
// BFF Message est le seul BFF, dans la même version, partout où ce dépôt le démarre.

const ROOT = path.join(__dirname, '..');
const PACKAGE_NAME = '@mairie360/bff-message-openapi';
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const manifest = readJson('package.json');
const pinned = manifest.dependencies[PACKAGE_NAME];

test('the BFF Message contract package is pinned to an exact published X.Y.Z version, installed as locked', () => {
  assert.match(pinned ?? '', /^\d+\.\d+\.\d+$/, `${PACKAGE_NAME} doit être épinglé à une version exacte (pas de plage ni de pré-version)`);
  assert.equal(readJson(`node_modules/${PACKAGE_NAME}/package.json`).version, pinned);
  assert.equal(readJson('package-lock.json').packages[`node_modules/${PACKAGE_NAME}`].version, pinned);
});

test('only one BFF contract package is used', () => {
  const all = { ...manifest.dependencies, ...manifest.devDependencies };
  assert.deepEqual(Object.keys(all).filter((name) => /^@mairie360\/bff-.*-openapi$/.test(name)), [PACKAGE_NAME]);
});

test('contracts/openapi.json is exactly the contract rebuilt from the installed package', async () => {
  const { buildOrvalOpenApi } = await import('../scripts/orval-contract.mjs');
  const snapshot = readJson('contracts/openapi.json');
  assert.equal(snapshot.info['x-source-package'], `${PACKAGE_NAME}@${pinned}`);
  assert.equal(snapshot.info.title, 'bff_message');
  assert.deepEqual(snapshot, buildOrvalOpenApi(PACKAGE_NAME, ROOT));
});

test('src imports contract types from the package only, never from a local copy', () => {
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  });
  walk(path.join(ROOT, 'src'));
  assert.deepEqual(files.filter((file) => file.endsWith('.d.ts')), [], 'aucune déclaration de contrat générée dans src/');
  const imports = files.flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(/from ["']([^"']*(?:contracts|openapi)[^"']*)["']/g)]
    .map(([, specifier]) => `${path.relative(ROOT, file)}: ${specifier}`));
  assert.deepEqual(imports.sort(), [
    'src/clients/messageClient.ts: @mairie360/bff-message-openapi/model',
    // Le proxy lit la reconstruction du paquet, vérifiée ci-dessus.
    'src/lib/bff-proxy.ts: ../../contracts/openapi.json',
  ]);
});

test('every Docker stack starts BFF Message only, in the version of the contract package', () => {
  for (const file of fs.readdirSync(ROOT).filter((name) => /^docker-compose.*\.ya?ml$/.test(name))) {
    const images = [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/ghcr\.io\/mairie360\/(bff-[\w-]+):([\w.-]+)/g)];
    assert.deepEqual(images.map(([, name, tag]) => `${name}:${tag}`), [`bff-message:${pinned}`], file);
  }
});
