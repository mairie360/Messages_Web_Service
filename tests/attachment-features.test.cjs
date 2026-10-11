const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { receiveAttachment } = requireSrc('lib/attachment-features.ts');

test('attachment download preserves the message and reports missing, refused and empty downloads', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(receiveAttachment({},'a1','conv1',signal), /pas encore disponible/);
  await assert.rejects(receiveAttachment({ download:async () => { throw new Error('403'); } },'a1','conv1',signal), /403/);
  await assert.rejects(receiveAttachment({ download:async () => ({ blob:new Blob([]),fileName:'file.pdf' }) },'a1','conv1',signal), /vide/);
  const file = await receiveAttachment({ download:async (attachment,conversation,receivedSignal) => {
    assert.equal(attachment,'a/1'); assert.equal(conversation,'conv/1'); assert.equal(receivedSignal,signal); return { blob:new Blob(['document']),fileName:'file.pdf' };
  } },'a/1','conv/1',signal);
  assert.equal(file.blob.size,8);
});
test('an aborted download never yields a file to a new conversation', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(receiveAttachment({ download:async () => ({ blob:new Blob(['file']),fileName:'file.pdf' }) },'a1','conv1',controller.signal), /annulé/);
});
