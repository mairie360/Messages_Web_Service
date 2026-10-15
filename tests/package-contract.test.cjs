const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// Le contrat du front est celui de BFF Message publié dans @mairie360/bff-message-openapi, épinglé à une version
// exacte (release X.Y.Z ou paquet dev 0.0.0-dev.<sha> du main du BFF, scripts/contract-version.mjs) :
// contracts/openapi.json doit en être la reconstruction exacte (scripts/orval-contract.mjs), et BFF Message est
// le seul BFF, dans l'image construite depuis le même commit, partout où ce dépôt le démarre.

const ROOT = path.join(__dirname, '..');
const PACKAGE_NAME = '@mairie360/bff-message-openapi';
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const manifest = readJson('package.json');
const pinned = manifest.dependencies[PACKAGE_NAME];

test('the BFF Message contract package is pinned to an exact published version, installed as locked', async () => {
  const { isAcceptedContractVersion } = await import('../scripts/contract-version.mjs');
  assert.ok(isAcceptedContractVersion(pinned), `${PACKAGE_NAME} doit être épinglé à une version exacte X.Y.Z ou 0.0.0-dev.<sha> (pas de plage ni de pré-version staging)`);
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
    // Generated operations own the browser and request-local server BFF paths.
    'src/lib/bff-client.ts: @mairie360/bff-message-openapi/endpoints/bffMessage',
    // Le proxy lit la reconstruction du paquet, vérifiée ci-dessus.
    'src/lib/bff-proxy.ts: ../../contracts/openapi.json',
    'src/lib/message-stream.ts: @mairie360/bff-message-openapi/endpoints/bffMessage',
    'src/lib/message-stream.ts: @mairie360/bff-message-openapi/model',
    'src/lib/messaging-bootstrap-receipt.ts: @mairie360/bff-message-openapi/model',
    'src/lib/server-messaging-page.ts: @mairie360/bff-message-openapi/endpoints/bffMessage',
    'src/middleware.ts: ../contracts/openapi.json',
  ]);
});

test('every Docker stack starts BFF Message only, in the image built from the contract package commit', async () => {
  const { imageTagForContractVersion } = await import('../scripts/contract-version.mjs');
  const expectedTag = imageTagForContractVersion(pinned);
  for (const file of fs.readdirSync(ROOT).filter((name) => /^docker-compose.*\.ya?ml$/.test(name))) {
    const images = [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/ghcr\.io\/mairie360\/(bff-[\w-]+):([\w.-]+)/g)];
    assert.deepEqual(images.map(([, name, tag]) => `${name}:${tag}`), [`bff-message:${expectedTag}`], file);
  }
});

test('MAIR-553: every Docker stack gives BFF Message the upstream URLs it requires at startup', () => {
  // Since MAIR-525 BFF Message calls Project API and Calendar API instead of their BFFs and exits when one of
  // these variables is missing: a stack still setting PROJECT_BFF_URL / CALENDAR_BFF_URL never becomes ready.
  for (const file of fs.readdirSync(ROOT).filter((name) => /^docker-compose.*\.ya?ml$/.test(name))) {
    const block = /^ {2}bff-message:\n((?: {4}.*\n|\s*\n)*)/m.exec(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    assert.ok(block, `${file}: no bff-message service`);
    const variables = [...block[1].matchAll(/^ {6}([A-Z_]+):/gm)].map(([, name]) => name);
    for (const required of ['MESSAGE_API_URL', 'CORE_API_URL', 'PROJECT_API_URL', 'CALENDAR_API_URL', 'JWT_SECRET']) {
      assert.ok(variables.includes(required), `${file}: bff-message needs ${required}`);
    }
    assert.deepEqual(variables.filter((name) => /_BFF_URL$/.test(name)), [], `${file}: BFF Message calls no other BFF`);
  }
});

test('the contract version policy accepts releases and dev packages and maps them to image tags', async () => {
  const { isAcceptedContractVersion, imageTagForContractVersion } = await import('../scripts/contract-version.mjs');
  assert.equal(imageTagForContractVersion('0.4.0'), '0.4.0');
  assert.equal(imageTagForContractVersion('0.0.0-dev.0f3838b81c6fa6e66b938c35ef211cf2ed862ad3'), 'dev-0f3838b');
  for (const rejected of ['^0.4.0', '0.4', '0.0.0-staging.0f3838b81c6fa6e66b938c35ef211cf2ed862ad3', '0.0.0-dev.0f3838b', 'latest']) {
    assert.equal(isAcceptedContractVersion(rejected), false, rejected);
  }
});
