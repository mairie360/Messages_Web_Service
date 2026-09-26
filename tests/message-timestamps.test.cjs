const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { requireSrc, ROOT } = require('./support/load-ts.cjs');
const { formatMessageTimestamp, presentConversationTimestamps, presentMessageTimestamps } = requireSrc('lib/message-timestamps.ts');

const expected = (value) => new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

for (const value of [undefined, '', ' ', 'Hier', '9:05', 'rendez-vous à 9 h 05', '25 h 30', '12 h 60', '0',
  '2026-09-26', '26/09/2026', '2026-02-30T12:00:00Z', '1900-02-29T12:00:00Z', '2026-04-31T12:00:00Z',
  '2026-00-12T12:00:00Z', '2026-13-12T12:00:00Z', '2026-09-00T12:00:00Z', '2026-09-26T24:00:00Z',
  '2026-09-26T12:60:00Z', '2026-09-26T12:00:60Z', '2026-09-26T12:00:00+25:00']) {
  test(`preserves missing or unrecognized timestamp ${JSON.stringify(value)}`, () => {
    assert.equal(formatMessageTimestamp(value), value);
  });
}

test('normalizes valid standalone legacy times without changing arbitrary labels', () => {
  for (const [source, label] of [['9 h 05', '9:05'], ['09h05', '09:05'], ['23 h 59', '23:59'], ['0 h 00', '0:00']]) {
    assert.equal(formatMessageTimestamp(source), label);
  }
});

test('formats valid ISO values, offsets, fractional seconds and leap days', () => {
  for (const value of ['2026-09-26T12:00:00Z', '2026-09-26T12:00:00.123Z', '2026-09-26T16:00:00+04:00',
    '2026-09-26T12:00', '2026-09-26T12:00:00', '2024-02-29T12:00:00Z', '2000-02-29T12:00:00Z']) {
    assert.equal(formatMessageTimestamp(value), expected(value));
  }
});

for (const [zone, source, label] of [
  ['UTC', '2026-09-26T23:30:00Z', '26/09 23:30'],
  ['Indian/Reunion', '2026-09-26T23:30:00Z', '27/09 03:30'],
  ['Europe/Paris', '2026-03-29T01:30:00Z', '29/03 03:30'],
  ['Europe/Paris', '2026-01-01T00:30:00Z', '01/01 01:30'],
]) {
  test(`uses the user's ${zone} timezone for ${source}`, () => {
    const script = `const {requireSrc} = require('./tests/support/load-ts.cjs');
      const {formatMessageTimestamp} = requireSrc('lib/message-timestamps.ts');
      process.stdout.write(formatMessageTimestamp(${JSON.stringify(source)}));`;
    const result = execFileSync(process.execPath, ['-e', script], {
      cwd: ROOT, env: { ...process.env, TZ: zone }, encoding: 'utf8',
    });
    assert.equal(result, label);
  });
}

test('presentation adapters preserve BFF objects, ordering and non-timestamp fields', () => {
  const attachments = Object.freeze([{ id: 'attachment-1', name: 'notice.txt' }]);
  const messages = Object.freeze([
    Object.freeze({ id: 'message-2', conversationId: 'conversation-1', content: 'Prévoir 9 h 05', sentAt: '2026-09-26T12:00:00Z', attachments }),
    Object.freeze({ id: 'message-1', conversationId: 'conversation-1', content: 'Suite', sentAt: undefined }),
  ]);
  const conversations = Object.freeze([
    Object.freeze({ id: 'conversation-2', name: 'Accueil', lastMessage: 'À 9 h 05', lastMessageAt: '2026-09-26T12:00:00Z', unreadCount: 3 }),
    Object.freeze({ id: 'conversation-1', name: 'Voirie', lastMessageAt: undefined }),
  ]);
  assert.deepEqual(presentMessageTimestamps(messages), messages.map(m => ({ ...m, sentAt: formatMessageTimestamp(m.sentAt) })));
  assert.deepEqual(presentConversationTimestamps(conversations), conversations.map(c => ({ ...c, lastMessageAt: formatMessageTimestamp(c.lastMessageAt) })));
  assert.equal(presentMessageTimestamps(messages)[0].attachments, attachments);
  assert.equal(messages[0].sentAt, '2026-09-26T12:00:00Z');
  assert.equal(conversations[0].lastMessageAt, '2026-09-26T12:00:00Z');
  assert.deepEqual(presentMessageTimestamps([]), []);
  assert.deepEqual(presentConversationTimestamps([]), []);
});
