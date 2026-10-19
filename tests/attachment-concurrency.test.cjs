const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { bffMessage } = requireSrc('lib/bff-client.ts');
const { messageClient } = requireSrc('clients/messageClient.ts');

test('attachment uploads overlap within three workers and retain the selected file order', async () => {
  const original = bffMessage.postAttachments;
  const files = Array.from({ length: 7 }, (_, index) => new File([String(index)], `${index}.txt`));
  let active = 0, peak = 0;
  bffMessage.postAttachments = async ({ files: file }) => {
    ++active; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, file.name === '0.txt' ? 15 : 1));
    --active;
    return { data: { attachments: [{ id: file.name }] } };
  };
  try {
    const result = await messageClient.uploadAttachments(files);
    assert.equal(peak, 3);
    assert.deepEqual(result.attachments.map(item => item.id), files.map(file => file.name));
  } finally { bffMessage.postAttachments = original; }
});

test('an upload failure rejects the batch and stops scheduling further files', async () => {
  const original = bffMessage.postAttachments;
  const files = Array.from({ length: 8 }, (_, index) => new File(['x'], `${index}.txt`));
  const started = [];
  bffMessage.postAttachments = async ({ files: file }) => {
    started.push(file.name);
    if (file.name === '0.txt') throw new Error('upload refused');
    await new Promise(resolve => setTimeout(resolve, 5));
    return { data: { attachments: [{ id: file.name }] } };
  };
  try {
    await assert.rejects(messageClient.uploadAttachments(files), /upload refused/);
    assert.deepEqual(started, ['0.txt', '1.txt', '2.txt']);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(started, ['0.txt', '1.txt', '2.txt']);
  } finally { bffMessage.postAttachments = original; }
});
