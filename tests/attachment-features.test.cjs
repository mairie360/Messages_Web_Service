const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { ATTACHMENTS_UNAVAILABLE_MESSAGE, messageAttachmentPort, pendingAttachmentPort, receiveAttachment, uploadDraftAttachments } = requireSrc('lib/attachment-features.ts');
const { messageClient } = requireSrc('clients/messageClient.ts');

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

test('MAIR-512: the pending port has no upload capability and refuses draft files before any call', (t) => {
  const upload = t.mock.method(messageClient, 'uploadAttachments', async () => ({ attachments: [] }));
  assert.deepEqual(Object.keys(pendingAttachmentPort), []);
  assert.throws(() => uploadDraftAttachments(pendingAttachmentPort, [new File(['a'], 'a.txt')]), { message: ATTACHMENTS_UNAVAILABLE_MESSAGE });
  assert.equal(upload.mock.callCount(), 0);
});
test('MAIR-512: messageAttachmentPort uploads through the published operation of the client', async (t) => {
  const files = [new File(['agenda'], 'agenda.txt', { type: 'text/plain' })];
  const reply = { attachments: [{ id: 'stored-42', name: 'agenda.txt' }] };
  const upload = t.mock.method(messageClient, 'uploadAttachments', async (received) => { assert.equal(received, files); return reply; });
  assert.equal(await uploadDraftAttachments(messageAttachmentPort, files), reply);
  assert.equal(upload.mock.callCount(), 1);
});
