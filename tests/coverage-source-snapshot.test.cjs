const assert = require('node:assert/strict');
const { test } = require('node:test');
const { verifySourceSnapshot } = require('../scripts/source-coverage.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
test('the final source snapshot rejects additions, deletions, declaration additions and changed bytes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'coverage-inventory-'));
  const content = 'export const count = 1;';
  const hashes = { 'src/runtime.ts': crypto.createHash('sha256').update(content).digest('hex') };
  try {
    await fs.mkdir(path.join(root, 'src'));
    const file = path.join(root, 'src/runtime.ts');
    await fs.writeFile(file, content);
    assert.deepEqual(await verifySourceSnapshot(root, hashes), []);
    const added = path.join(root, 'src/added.tsx');
    await fs.writeFile(added, 'export const view = 1;');
    assert.ok((await verifySourceSnapshot(root, hashes)).some(f => f.file === 'src/added.tsx' && f.metric === 'presence'));
    await fs.rm(added);
    const declaration = path.join(root, 'src/types.d.ts');
    await fs.writeFile(declaration, 'export type Identifier = string;');
    assert.ok((await verifySourceSnapshot(root, hashes)).some(f => f.file === 'src/types.d.ts' && f.metric === 'presence'));
    await fs.rm(declaration);
    await fs.writeFile(file, 'export const count = 2;');
    assert.ok((await verifySourceSnapshot(root, hashes)).some(f => f.metric === 'source integrity'));
    await fs.rm(file);
    assert.ok((await verifySourceSnapshot(root, hashes)).some(f => f.file === 'src/runtime.ts' && f.metric === 'presence'));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
