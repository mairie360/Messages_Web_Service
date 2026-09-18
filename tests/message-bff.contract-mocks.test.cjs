const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, describe, test } = require('node:test');
const {
  apiError, bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffMock, tokenFor, users,
} = require('./support/fixtures.cjs');
const { FrontNetwork } = require('./support/front-network.cjs');
const { requireSrc } = require('./support/load-ts.cjs');

// Le vrai client navigateur (src/clients/messageClient.ts) appelle des chemins same-origin ; le réseau simulé
// les route vers les vrais handlers Next.js (catch-all contractuel ou route explicite) qui relaient en HTTP
// réel vers BFF Message, simulé par le contrat du paquet publié (contracts/openapi.json). Chaque requête
// (chemin, méthode, paramètres, corps) et chaque réponse est validée contre ce contrat, et aucun autre hôte
// n'est joignable : BFF Message est le seul BFF du front.

const messageBff = messageBffMock();
const network = new FrontNetwork([messageBff]);
const { BffRequestError, messageClient } = requireSrc('clients/messageClient.ts');

const agentToken = tokenFor(users.agent.id);
const upstream = () => messageBff.requests.map((call) => `${call.method} ${call.url.pathname}`);

before(async () => {
  await messageBff.start();
  delete process.env.MESSAGE_BFF_URL;
  delete process.env.NEXT_PUBLIC_BFF_MESSAGE_BASE_URL;
  process.env.BFF_MESSAGE_BASE_URL = messageBff.url;
  network.install();
});
after(async () => {
  network.restore();
  await messageBff.stop();
});
beforeEach(() => {
  messageBff.reset();
  network.reset();
  network.cookies.accessToken = agentToken;
});
afterEach(() => {
  assert.deepEqual([...messageBff.violations, ...network.violations], []);
});

/**
 * Un scénario par méthode de messageClient : le test de complétude ci-dessous impose qu'une nouvelle méthode
 * du client soit couverte ici, donc vérifiée contre le contrat du BFF.
 */
const clientScenarios = {
  async getCurrentUser() {
    const body = currentUser();
    messageBff.on('get', '/me', { body });
    assert.deepEqual(await messageClient.getCurrentUser(), body);
    assert.deepEqual(upstream(), ['GET /me']);
  },
  async getBootstrap() {
    const body = bootstrap();
    messageBff.on('get', '/messaging/bootstrap', { body });
    assert.deepEqual(await messageClient.getBootstrap(), body);
    assert.deepEqual(upstream(), ['GET /messaging/bootstrap']);
  },
  async getContacts() {
    const body = { contacts: [contact(users.sophie), contact(users.thomas, { presence: 'away' })] };
    messageBff.on('get', '/contacts', { body });
    assert.deepEqual(await messageClient.getContacts(), body);
    assert.deepEqual(upstream(), ['GET /contacts']);
  },
  async getBusinessReferences() {
    const body = businessReferences();
    messageBff.on('get', '/business-references', { body });
    assert.deepEqual(await messageClient.getBusinessReferences(), body);
    assert.equal(network.resolve('/business-references').route, '/business-references', 'servi par la route explicite');
    assert.deepEqual(upstream(), ['GET /business-references']);
  },
  async getConversationMessages() {
    const body = { conversation: conversation(4, 'Équipe communication'), messages: [message(1, 4, 'Bonjour', users.sophie), message(2, 4, 'Salut')] };
    messageBff.on('get', '/conversations/{conversationId}/messages', { body });
    assert.deepEqual(await messageClient.getConversationMessages('conversation-4'), body);
    assert.deepEqual(messageBff.calls('/conversations/{conversationId}/messages')[0].pathParams, { conversationId: 'conversation-4' });
  },
  async sendMessage() {
    const body = { message: message(3, 4, 'Réunion à 14h'), conversation: conversation(4, 'Équipe communication', { lastMessage: 'Réunion à 14h' }) };
    messageBff.on('post', '/conversations/{conversationId}/messages', { status: 201, body });
    const payload = { content: 'Réunion à 14h', attachmentIds: ['attachment-1'], mentionIds: [users.sophie.id] };
    assert.deepEqual(await messageClient.sendMessage(4, payload), body);
    const [call] = messageBff.calls('/conversations/{conversationId}/messages', 'post');
    assert.deepEqual({ id: call.pathParams.conversationId, body: call.body, type: call.headers['content-type'] }, { id: '4', body: payload, type: 'application/json' });
  },
  async createDirectMessage() {
    const body = { conversation: conversation(6, 'Thomas Bernard', { kind: 'direct' }), message: message(4, 6, 'Bonjour Thomas') };
    messageBff.on('post', '/direct-messages', { status: 201, body });
    const payload = { recipientId: `user-${users.thomas.id}`, message: 'Bonjour Thomas' };
    assert.deepEqual(await messageClient.createDirectMessage(payload), body);
    assert.deepEqual(messageBff.calls('/direct-messages')[0].body, payload);
  },
  async createGroup() {
    const body = { conversation: conversation(7, 'Commission voirie') };
    messageBff.on('post', '/groups', { status: 201, body });
    const payload = { name: 'Commission voirie', description: 'Travaux 2026', memberIds: [`user-${users.sophie.id}`, users.thomas.id] };
    assert.deepEqual(await messageClient.createGroup(payload), body);
    assert.deepEqual(messageBff.calls('/groups')[0].body, payload);
  },
  async deleteConversation() {
    messageBff.on('delete', '/conversations/{conversationId}', { body: { deleted: true, conversationId: 'conversation-5' } });
    assert.deepEqual(await messageClient.deleteConversation('conversation-5'), { deleted: true, conversationId: 'conversation-5' });
    assert.deepEqual(upstream(), ['DELETE /conversations/conversation-5']);
  },
};

describe('messageClient through the Next.js routes against the BFF_Message contract', () => {
  test('every messageClient method has a contract scenario', () => {
    assert.deepEqual(Object.keys(messageClient).sort(), Object.keys(clientScenarios).sort());
  });

  for (const [method, scenario] of Object.entries(clientScenarios)) {
    test(`${method} only reaches BFF_Message through a declared operation`, async () => {
      await scenario();
      // Un seul aller-retour navigateur -> route Next.js -> BFF_Message, sans autre appel réseau.
      assert.equal(network.browserCalls.length, 1);
      assert.deepEqual(network.serverCalls.map((call) => `${call.service} ${call.method} ${call.path}`), upstream().map((call) => `BFF_MESSAGE ${call}`));
      for (const call of messageBff.requests) {
        assert.equal(call.headers.authorization, `Bearer ${agentToken}`, 'cookie accessToken promu en Bearer');
        assert.equal(call.headers.cookie, undefined, 'les cookies du navigateur ne sont pas relayés');
        assert.equal(call.headers.accept, 'application/json');
      }
    });
  }
});

describe('BFF_Message errors surfaced by messageClient', () => {
  test('documented 401 ApiErrorResponse bodies become a BffRequestError with their message', async () => {
    messageBff.on('get', '/messaging/bootstrap', { status: 401, body: apiError('UNAUTHORIZED', 'Session expirée') });
    await assert.rejects(messageClient.getBootstrap(), (error) => error instanceof BffRequestError && error.status === 401 && error.message === 'Session expirée');

    messageBff.on('post', '/groups', { status: 401, body: apiError('UNAUTHORIZED', 'Authentification requise') });
    await assert.rejects(messageClient.createGroup({ name: 'Groupe', memberIds: [] }), { message: 'Authentification requise' });
  });

  test('an undocumented non-JSON failure falls back to a status message', async () => {
    messageBff.on('get', '/contacts', { status: 500, raw: 'Internal Server Error', contentType: 'text/plain', outOfContract: true });
    await assert.rejects(messageClient.getContacts(), { status: 500, message: 'Erreur BFF messages (500)' });
  });

  test('an unreachable BFF becomes the controlled 502 error of the proxy', async () => {
    messageBff.on('get', '/conversations/{conversationId}/messages', { dropConnection: true });
    await assert.rejects(messageClient.getConversationMessages(4), { status: 502, message: 'Le service est indisponible.' });
  });

  test('an empty successful body resolves to undefined', async () => {
    messageBff.on('delete', '/conversations/{conversationId}', { status: 200, raw: '', outOfContract: true });
    assert.equal(await messageClient.deleteConversation(8), undefined);
  });
});

describe('same-origin proxy only forwards operations declared by the BFF_Message contract', () => {
  const contract = messageBff.contract;
  const concrete = (template) => template.replace(/\{[^}]+\}/g, 'conversation-1');

  /** Requête minimale conforme au contrat (paramètres query requis et corps), construite par `contract.sample`. */
  const sampleRequest = (method, template) => {
    const { operation } = contract.match(method, concrete(template));
    const query = new URLSearchParams((operation.parameters ?? [])
      .filter((parameter) => parameter.in === 'query' && parameter.required)
      .map((parameter) => [parameter.name, String(contract.sample(parameter.schema, parameter.name))]));
    const content = operation.requestBody?.content ?? {};
    let init = {};
    if (content['application/json']) {
      init = { body: JSON.stringify(contract.sample(content['application/json'].schema, 'request')), headers: { 'Content-Type': 'application/json' } };
    } else if (content['multipart/form-data']) {
      const form = new FormData();
      form.append('files', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'note.pdf');
      init = { body: form };
    }
    return { url: `${concrete(template)}${query.size ? `?${query}` : ''}`, init: { method, ...init } };
  };

  test('every declared operation is forwarded with its query string and body', async () => {
    for (const operation of contract.operations()) {
      const [method, template] = operation.split(' ');
      const { schema } = contract.responseSchema(contract.match(method, concrete(template)), 200);
      messageBff.on(method, template, { status: 200, body: schema ? contract.sample(schema, 'reply') : undefined });
    }
    for (const operation of contract.operations()) {
      const [method, template] = operation.split(' ');
      const { url, init } = sampleRequest(method, template);
      const response = await fetch(url, init);
      assert.equal(response.status, 200, operation);
    }
    assert.deepEqual(upstream().sort(), contract.operations().map((operation) => {
      const [method, template] = operation.split(' ');
      return `${method} ${concrete(template)}`;
    }).sort());

    messageBff.reset();
    messageBff.on('get', '/contacts', { body: { contacts: [] } });
    await fetch('/contacts?search=sophie&limit=5');
    assert.equal(messageBff.calls('/contacts')[0].url.search, '?search=sophie&limit=5');
  });

  test('multipart uploads are relayed byte for byte', async () => {
    messageBff.on('post', '/attachments', { status: 201, body: contract.sample(contract.responseSchema(contract.match('POST', '/attachments'), 201).schema, 'reply') });
    const { url, init } = sampleRequest('POST', '/attachments');
    assert.equal((await fetch(url, init)).status, 201);
    const [upload] = messageBff.calls('/attachments');
    assert.match(upload.headers['content-type'], /^multipart\/form-data; boundary=/);
    assert.match(upload.rawBody.toString('utf8'), /filename="note.pdf"[\s\S]*%PDF-1\.4/);
  });

  test('undeclared methods are rejected with 405 before any network call', async () => {
    for (const template of Object.keys(contract.document.paths)) {
      const declared = Object.keys(contract.document.paths[template]).map((method) => method.toUpperCase());
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((candidate) => !declared.includes(candidate))) {
        const response = await fetch(concrete(template), { method });
        assert.equal(response.status, 405, `${method} ${template}`);
        assert.ok(response.headers.get('Allow').split(', ').every((allowed) => declared.includes(allowed) || (allowed === 'HEAD' && declared.includes('GET'))));
      }
    }
    assert.deepEqual(network.serverCalls, []);
  });

  test('undeclared paths and dot segments never reach the BFF', async () => {
    for (const pathname of ['/conversations/1/messages/2', '/admin/users', '/session/me', '/api/user/me', '/messaging']) {
      const response = await fetch(pathname);
      assert.equal(response.status, 404, pathname);
    }
    // Le navigateur normalise `.`/`..` ; un client HTTP brut peut les envoyer tels quels au catch-all.
    const { proxyBffRequest } = requireSrc('lib/bff-proxy.ts');
    const { NextRequest } = require('next/server');
    for (const path of [['conversations', '..'], ['.'], ['conversations', ''], ['conversations', 'a/b']]) {
      const response = await proxyBffRequest(new NextRequest('http://localhost:5003/raw'), { params: Promise.resolve({ path }) });
      assert.equal(response.status, 400, path.join('|'));
    }
    assert.deepEqual(network.serverCalls, []);
  });

  test('absolute URLs to hosts other than BFF Message are blocked', async () => {
    await assert.rejects(fetch('http://localhost:4000/me'), TypeError);
    assert.deepEqual(network.violations, ['appel réseau hors contrat vers http://localhost:4000/me']);
    network.violations.length = 0;
  });
});
