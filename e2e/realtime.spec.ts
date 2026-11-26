import { randomBytes } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { cookieHeader, signInAs, users } from './support/session';

// MAIR-818: real-time reception over the front's WebSocket /ws, on the real stack of docker-compose-e2e.yml (the
// image under test relays /ws to BFF Message, which relays Message API). The handshake checks follow the front column
// of Message_API docs/en/realtime-websocket.md; the journey is epic MAIR-655 CA1 and CA10: a message posted by a
// colleague appears in the open conversation without reloading the page and without the 2 s reload.

const realtimeMessage = `Message temps réel ${process.env.E2E_RUN_ID ?? Date.now()}`;

/** Raw handshake on the front's /ws, as a browser sends it: resolves with the status (101 when upgraded). */
function handshake(baseURL: string, headers: Record<string, string>) {
  const { hostname, port } = new URL(baseURL);
  return new Promise<number>((resolve, reject) => {
    const request = httpRequest({
      hostname, port, path: '/ws',
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'), ...headers },
    });
    request.on('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode ?? 0); });
    request.on('response', response => { response.resume(); resolve(response.statusCode ?? 0); });
    request.on('error', reject);
    request.end();
  });
}

/** Same-origin JSON headers of a browser call through the front proxy. */
const asBrowser = (baseURL: string, user: typeof users.sender) => ({
  Cookie: cookieHeader(user), Accept: 'application/json', Origin: new URL(baseURL).origin, 'Sec-Fetch-Site': 'same-origin',
});

/** The direct conversation of the sender and the recipient (created by the first journey, or here when run alone). */
async function directConversation(request: APIRequestContext, baseURL: string) {
  const find = async () => {
    const response = await request.get('/conversations', { headers: asBrowser(baseURL, users.recipient) });
    expect(response.status()).toBe(200);
    const { conversations } = await response.json() as { conversations: { id: string | number; contactId?: string | number }[] };
    return conversations.find(c => String(c.contactId) === `user-${users.sender.id}`);
  };
  let conversation = await find();
  if (!conversation) {
    const created = await request.post('/direct-messages', {
      headers: asBrowser(baseURL, users.sender), data: { recipientId: `user-${users.recipient.id}`, message: 'Bonjour' },
    });
    expect([200, 201]).toContain(created.status());
    conversation = await find();
  }
  expect(conversation, 'direct conversation of the sender and the recipient').toBeTruthy();
  return String(conversation!.id);
}

test('MAIR-818 the front upgrades /ws for a signed-in same-origin page only', async ({ baseURL }) => {
  const origin = new URL(baseURL!).origin;
  expect(await handshake(baseURL!, { Origin: origin, Cookie: cookieHeader(users.recipient) })).toBe(101);
  expect(await handshake(baseURL!, { Origin: origin })).toBe(401);
  expect(await handshake(baseURL!, { Origin: 'https://evil.example', Cookie: cookieHeader(users.recipient) })).toBe(403);
});

test('MAIR-818 a colleague’s message appears in the open conversation without reload nor 2 s polling', async ({ page, context, baseURL, request }) => {
  const conversationId = await directConversation(request, baseURL!);
  await signInAs(context, baseURL!, users.recipient);
  const socketOpened = page.waitForEvent('websocket', socket => new URL(socket.url()).pathname === '/ws');
  const isListRead = (method: string, url: string) => method === 'GET' && new URL(url).pathname === '/conversations';
  // Once connected, the page reads the list once to catch up: that read is expected and left out of the measure.
  const catchUp = page.waitForResponse(r => isListRead(r.request().method(), r.url()), { timeout: 10_000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Messagerie', level: 1 })).toBeVisible();
  await page.locator('[data-messaging-sidebar]').getByText('Perf Tester').first().click();
  const socket = await socketOpened;
  expect(new URL(socket.url()).origin.replace(/^ws/, 'http')).toBe(new URL(baseURL!).origin);

  await catchUp;
  await page.waitForTimeout(500);

  // Connected: the list is no longer reloaded every 2 s.
  const listReads: string[] = [];
  page.on('request', r => { if (isListRead(r.method(), r.url())) listReads.push(r.url()); });
  await page.waitForTimeout(5_000);
  expect(socket.isClosed(), 'the socket stays open').toBe(false);
  expect(listReads, 'no 2 s reload while the WebSocket is connected').toHaveLength(0);

  // A colleague posts: the signal comes through /ws and the page reads the conversation again.
  const signal = socket.waitForEvent('framereceived', { predicate: frame => String(frame.payload).includes('"NEW_MSG"'), timeout: 10_000 });
  const posted = await request.post(`/conversations/${conversationId}/messages`, {
    headers: asBrowser(baseURL!, users.sender), data: { content: realtimeMessage },
  });
  expect(posted.ok(), `POST answered ${posted.status()}`).toBe(true);
  const frame = await signal;
  expect(JSON.parse(String(frame.payload))).toMatchObject({ type: 'NEW_MSG', conversationId });
  // In the open thread's bubbles, not the list preview, which shows the last message too.
  await expect(page.locator('[data-messaging-message-id]', { hasText: realtimeMessage })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('Réception des messages retardée')).toHaveCount(0);
});

test('MAIR-1182 a colleague mentions the agent: one bell alert, which opens the conversation', async ({ page, context, baseURL, request }) => {
  const runId = process.env.E2E_RUN_ID ?? String(Date.now());
  const directId = await directConversation(request, baseURL!);
  const groupName = `Mentions ${runId}`;
  const created = await request.post('/groups', {
    headers: asBrowser(baseURL!, users.sender),
    data: { name: groupName, description: 'Alerte de mention', memberIds: [`user-${users.recipient.id}`] },
  });
  expect([200, 201]).toContain(created.status());
  const groupId = String((await created.json() as { conversation: { id: string | number } }).conversation.id);

  // The agent reads the direct conversation, not the group.
  await signInAs(context, baseURL!, users.recipient);
  const socketOpened = page.waitForEvent('websocket', socket => new URL(socket.url()).pathname === '/ws');
  await page.goto(`/?conversation=${encodeURIComponent(directId)}`);
  await expect(page.getByRole('heading', { name: 'Messagerie', level: 1 })).toBeVisible();
  const socket = await socketOpened;
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();

  const mention = socket.waitForEvent('framereceived', { predicate: frame => String(frame.payload).includes('"MENTIONED"'), timeout: 10_000 });
  const mentionText = `Avis demandé ${runId}`;
  const posted = await request.post(`/conversations/${groupId}/messages`, {
    headers: asBrowser(baseURL!, users.sender), data: { content: mentionText, mentionIds: [`user-${users.recipient.id}`] },
  });
  expect(posted.ok(), `POST answered ${posted.status()}`).toBe(true);
  expect(JSON.parse(String((await mention).payload))).toMatchObject({ type: 'MENTIONED', conversationId: groupId });

  // One alert for the mention, although NEW_MSG and MENTIONED both arrived.
  const bell = page.getByRole('button', { name: 'Notifications, 1 non lues' });
  await expect(bell).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(1_000);
  await expect(bell).toBeVisible();

  await bell.click();
  const panel = page.getByRole('dialog', { name: 'Notifications' });
  await expect(panel.getByText(`Mention dans « ${groupName} »`)).toBeVisible();
  await panel.getByRole('link', { name: 'Ouvrir' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`[?&]conversation=${encodeURIComponent(groupId)}`));
  await expect(page.locator('[data-messaging-message-id]', { hasText: mentionText })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();

  await request.delete(`/conversations/${groupId}`, { headers: asBrowser(baseURL!, users.sender) });
});

test('MAIR-1182 a @mention in a message opens the card of the colleague, whose « Écrire » opens the direct conversation', async ({ page, context, baseURL, request }) => {
  const runId = process.env.E2E_RUN_ID ?? String(Date.now());
  const directId = await directConversation(request, baseURL!);
  // The sender's name as the BFF knows it: the tag in the text is `@<name>`.
  const contacts = await request.get('/contacts', { headers: asBrowser(baseURL!, users.recipient) });
  expect(contacts.status()).toBe(200);
  const sender = ((await contacts.json()) as { contacts: { id: string | number; name: string }[] }).contacts
    .find(contact => String(contact.id).replace(/^user-/, '') === users.sender.id);
  expect(sender, 'the sender is a contact of the recipient').toBeTruthy();

  const created = await request.post('/groups', {
    headers: asBrowser(baseURL!, users.sender),
    data: { name: `Fiche ${runId}`, description: 'Fiche d’un agent mentionné', memberIds: [`user-${users.recipient.id}`] },
  });
  expect([200, 201]).toContain(created.status());
  const groupId = String((await created.json() as { conversation: { id: string | number } }).conversation.id);
  const posted = await request.post(`/conversations/${groupId}/messages`, {
    headers: asBrowser(baseURL!, users.recipient),
    data: { content: `Voir avec @${sender!.name} ${runId}`, mentionIds: [`user-${users.sender.id}`] },
  });
  expect(posted.ok(), `POST answered ${posted.status()}`).toBe(true);

  await signInAs(context, baseURL!, users.recipient);
  await page.goto(`/?conversation=${encodeURIComponent(groupId)}`);
  const tag = page.getByRole('button', { name: `Ouvrir la fiche de ${sender!.name}` });
  await expect(tag).toBeVisible({ timeout: 10_000 });
  await tag.click();
  const card = page.getByRole('dialog', { name: new RegExp(sender!.name) });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: `Écrire à ${sender!.name}` }).click();
  await expect(card).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`[?&]conversation=${encodeURIComponent(directId)}`));

  await request.delete(`/conversations/${groupId}`, { headers: asBrowser(baseURL!, users.sender) });
});
