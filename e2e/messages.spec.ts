import { expect, test, type Page } from '@playwright/test';
import { cookieHeader, signInAs, users } from './support/session';

// Critical journeys of the Messages front (MAIR-603), on the real stack of docker-compose-e2e.yml
// (BFF Message, Core and Message APIs, seeded database): an agent sends a direct message, the
// recipient reads it in the conversation, and an agent outside the conversation can neither see
// nor read it. The texts asserted are the French ones displayed on screen.
//
// The journeys run in file order (one worker) but share no variable: after a failure Playwright
// restarts the worker, so each journey reads what it needs from the stack.

const message = `Bonjour, message de bout en bout ${process.env.E2E_RUN_ID}`;

async function openMessaging(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Messagerie', level: 1 })).toBeVisible();
}

/** Conversation of the sender and the recipient, read as the recipient. */
async function directConversationId(request: import('@playwright/test').APIRequestContext) {
  const response = await request.get('/conversations', {
    headers: { Cookie: cookieHeader(users.recipient), Accept: 'application/json' },
  });
  expect(response.status()).toBe(200);
  const { conversations } = await response.json() as { conversations: { id: string | number; contactId?: string | number }[] };
  const conversation = conversations.find((c) => String(c.contactId) === `user-${users.sender.id}`);
  expect(conversation, 'direct conversation of the sender and the recipient').toBeTruthy();
  return String(conversation!.id);
}

test('an agent sends a direct message', async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, users.sender);
  await openMessaging(page);

  // The page is server-rendered first: retry the opening until the button is hydrated.
  // MAIR-1157: « Nouveau message » is an entry of the « + » menu of the list.
  const dialog = page.getByRole('dialog', { name: 'Nouveau message' });
  await expect(async () => {
    const menu = page.getByRole('menu', { name: 'Nouvelle conversation' });
    if (!(await menu.isVisible())) await page.getByRole('button', { name: 'Nouvelle conversation' }).click();
    await menu.getByRole('menuitem', { name: 'Nouveau message' }).click({ timeout: 1_000 });
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await dialog.getByRole('combobox', { name: 'Destinataire' }).selectOption({ label: 'Contact Sample' });
  await dialog.getByRole('textbox', { name: 'Message' }).fill(message);

  // The seeded sender and recipient have no conversation yet: the message creates it. A retry of
  // this journey would write into that conversation instead (MAIR-204) and pass over a failed
  // creation, so the creation itself is asserted, retry or not.
  const sent = page.waitForResponse((r) => r.request().method() === 'POST' && /\/(direct-messages|messages)$/.test(new URL(r.url()).pathname));
  await dialog.getByRole('button', { name: 'Envoyer' }).click();
  const response = await sent;
  expect(new URL(response.url()).pathname, 'the message creates the direct conversation').toMatch(/\/direct-messages$/);
  expect(response.status()).toBe(201);

  // MAIR-865: the confirmation is a lib toast; its text is also in the hidden live region that announces it.
  await expect(page.getByRole('group', { name: 'Message direct créé' })).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(message).first()).toBeVisible();
});

test('the recipient reads it in the conversation', async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, users.recipient);
  await openMessaging(page);

  await page.getByRole('complementary').getByText('Perf Tester').first().click();
  await expect(page.getByText(message).first()).toBeVisible();
});

test('an agent outside the conversation does not see it', async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, users.outsider);
  await openMessaging(page);

  // MAIR-1171: a list without any conversation says so in a short text; the thread shows « Commencez à échanger ».
  await expect(page.getByText('Aucune conversation pour l’instant.')).toBeVisible();
  await expect(page.getByText('Commencez à échanger')).toBeVisible();
  await expect(page.getByText(message)).toHaveCount(0);
});

test('an agent outside the conversation is refused when reading it directly', async ({ request }) => {
  const conversationId = await directConversationId(request);
  const response = await request.get(`/conversations/${conversationId}/messages`, {
    headers: { Cookie: cookieHeader(users.outsider), Accept: 'application/json' },
    maxRedirects: 0,
  });
  expect([403, 404]).toContain(response.status());
  expect(await response.text()).not.toContain(message);
});

test('without a session, the messaging is not served', async ({ request }) => {
  const response = await request.get('/', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
});

// The messaging opened from a project (`?context=project-<n>`). This stack has no Project API, so the
// project cannot be read: the page must open without a context and say so, never trust the URL for a title.
test('MAIR-1181 a project the agent cannot read opens the messaging without a context', async ({ page, context, baseURL }) => {
  await signInAs(context, baseURL!, users.sender);
  const suggestions = page.waitForResponse((r) => r.request().method() === 'GET' && new URL(r.url()).pathname === '/link-suggestions');
  await page.goto('/?context=project-1');
  await expect(page.getByRole('heading', { name: 'Messagerie', level: 1 })).toBeVisible();
  expect((await suggestions).status()).toBe(200);

  await expect(page.getByText('Le projet lié n’est pas accessible').first()).toBeVisible();
  await expect(page.getByText('La messagerie s’ouvre sans contexte.').first()).toBeVisible();
  await expect(page.getByLabel('Message contextuel')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Nouveau message' })).toBeHidden();
  expect(new URL(page.url()).searchParams.get('context')).toBeNull();
});
