const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

const { readShellInfoFromEnv, legalLinksFor } = requireSrc('lib/shell-info.ts');
const { navigationItems, totalUnread } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/AppShell/navigation-items.ts');

test('MAIR-844 the commune name and the version are optional runtime values', () => {
  assert.deepEqual(readShellInfoFromEnv({ COMMUNE_NAME: '  Villeneuve ', APP_VERSION: '3.2.1' }), { communeName: 'Villeneuve', version: '3.2.1' });
  assert.deepEqual(readShellInfoFromEnv({ COMMUNE_NAME: '  ', APP_VERSION: '' }), { communeName: undefined, version: undefined });
});

test('MAIR-844 legal links point at the Login front pages and need a valid Login URL', () => {
  assert.deepEqual(legalLinksFor('https://login.example/'), {
    legalNotice: 'https://login.example/mentions-legales', privacyPolicy: 'https://login.example/confidentialite',
  });
  assert.equal(legalLinksFor(undefined), undefined);
  assert.equal(legalLinksFor('javascript:alert(1)'), undefined);
});

test('MAIR-844 « Messagerie » carries the unread total as its badge', () => {
  assert.equal(totalUnread([{ unreadCount: 2 }, { unreadCount: 3 }, {}, { unreadCount: -1 }, { unreadCount: 1.5 }]), 5);
  const ids = navigationItems(0).map((item) => item.id);
  assert.deepEqual(ids, ['dashboard', 'projects', 'messages', 'training', 'calendar', 'admin', 'settings']);
  assert.equal(navigationItems(0).find((item) => item.id === 'messages').count, undefined);
  assert.equal(navigationItems(4).find((item) => item.id === 'messages').count, 4);
  assert.equal(navigationItems(120).find((item) => item.id === 'messages').count, 120);
  assert.equal(navigationItems(4).filter((item) => item.count || item.badge).length, 1);
});

test('MAIR-1156 the navigation counter is the lib count (its Counter shows « 9+ »), the administration stays role-gated and there is no Workflows', () => {
  assert.equal(navigationItems(-3).find((item) => item.id === 'messages').count, undefined);
  assert.equal(navigationItems(Number.NaN).find((item) => item.id === 'messages').count, undefined);
  const items = navigationItems(12);
  assert.equal(items.find((item) => item.id === 'messages').count, 12);
  assert.equal(items.find((item) => item.id === 'admin').adminOnly, true);
  assert.equal(items.some((item) => /workflow/i.test(item.id + item.label)), false);
});
