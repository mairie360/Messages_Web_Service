const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { NextResponse } = require('next/server');
const { requireSrc } = require('./support/load-ts.cjs');
const { clearAccessTokenCookie } = requireSrc('lib/access-token-cookie.ts');
const { describeBffError } = requireSrc('lib/bff-error-messages.ts');
const { BffRequestError } = requireSrc('clients/messageClient.ts');
const { receiveAttachment } = requireSrc('lib/attachment-features.ts');
const savedDomain = process.env.COOKIE_DOMAIN;
afterEach(() => { savedDomain === undefined ? delete process.env.COOKIE_DOMAIN : process.env.COOKIE_DOMAIN = savedDomain; });

test('access-cookie expiry keeps the original shared scope and leaves unrelated cookies alone', () => {
  for (const domain of [undefined, ' ', ' .mairie.example ']) {
    domain === undefined ? delete process.env.COOKIE_DOMAIN : process.env.COOKIE_DOMAIN = domain;
    const response = NextResponse.json({ success: true }); response.cookies.set('unrelated', 'preserved');
    assert.equal(clearAccessTokenCookie(response), response);
    const cookie = response.cookies.get('accessToken');
    assert.equal(cookie.value, ''); assert.equal(cookie.path, '/'); assert.equal(cookie.maxAge, 0); assert.equal(cookie.expires.getTime(), 0);
    assert.equal(cookie.domain, domain?.trim() || undefined);
    assert.equal(response.cookies.get('unrelated').value, 'preserved');
  }
});
const refused = details => new BffRequestError('BFF fallback', 400, { error: { code: 'BAD_REQUEST', details } });
for (const [field, message, wanted] of [
  ['body.content', 'Must not contain < or >', 'Le message ne doit pas contenir les caractères < ou >.'],
  ['body.message', 'String must contain at most 10000 character(s)', 'Le message dépasse 10 000 caractères.'],
  ['body.name', 'Too big: expected string to have <=120 characters', 'Le nom du groupe dépasse 120 caractères.'],
  ['body.description', 'Required', 'La description du groupe est vide ou contient des caractères non autorisés.'],
  ['body.content', 'must not be blank', 'Le message est vide ou contient des caractères non autorisés.'],
  ['body.content', 'custom refusal', 'Le message : custom refusal'],
  ['body.mentionIds.0', 'invalid', 'Une mention ne correspond à aucun utilisateur connu. Retirez-la avant d’envoyer.'],
  ['body.memberIds.1', 'invalid', 'Un membre sélectionné ne correspond à aucun utilisateur connu.'],
  ['body.recipientId', 'invalid', 'Le destinataire ne correspond à aucun utilisateur connu.'],
  ['body.unknown.2', 'invalid', 'unknown : invalid'],
  ['body', 'invalid payload', 'invalid payload'],
  [undefined, 'missing path', 'missing path'],
]) test(`validation feedback identifies ${field ?? 'the payload'} without losing the refusal`, () => {
  assert.equal(describeBffError(refused([{ path: field, message }]), 'local fallback'), wanted);
});
test('duplicate field refusals are announced once while ordinary errors and unknown failures preserve fallback behavior', () => {
  assert.equal(describeBffError(refused([{ path: 'body.content', message: 'Required' }, { path: 'body.content', message: 'Required' }]), 'fallback'), 'Le message est vide ou contient des caractères non autorisés.');
  assert.equal(describeBffError(new BffRequestError('Denied', 403, { error: { details: [{ path:'body.content', message:'Required' }] } }), 'fallback'), 'Denied');
  assert.equal(describeBffError(new BffRequestError('Bad payload', 400), 'fallback'), 'Bad payload');
  assert.equal(describeBffError(new Error('Network unavailable'), 'fallback'), 'Network unavailable');
  assert.equal(describeBffError(null, 'fallback'), 'fallback');
});
test('incomplete attachment receipts cannot become downloads', async () => {
  for (const file of [null, {}, { blob: 'not a blob', fileName: 'a.pdf' }, { blob: new Blob(['valid']), fileName: ' ' }, { blob: new Blob(['valid']) }]) {
    await assert.rejects(receiveAttachment({ download: async () => file }, 'attachment', 'conversation', new AbortController().signal), /vide ou incomplet/);
  }
});
