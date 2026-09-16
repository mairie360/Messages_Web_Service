const path = require('node:path');
const { ContractMockServer } = require('./contract-mock-server.cjs');
const { ROOT } = require('./load-ts.cjs');
const { OpenApiContract } = require('./openapi-contract.cjs');

// Données de test conformes au contrat de BFF Message : contracts/openapi.json, reconstruit depuis le paquet
// publié @mairie360/bff-message-openapi épinglé (tests/package-contract.test.cjs le vérifie). Le mock valide
// chaque réponse : une fixture qui dérive du contrat fait donc échouer les tests qui l'utilisent.

const messageBffContract = () => OpenApiContract.load(path.join(ROOT, 'contracts', 'openapi.json'));
const messageBffMock = () => new ContractMockServer('BFF_MESSAGE', messageBffContract());

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
/** JWT non signé valable une heure (le front ne vérifie pas la signature). */
const tokenFor = (userId) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: String(userId), exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;

const users = {
  agent: { id: 2, name: 'Agent Mairie', email: 'agent@mairie360.fr' },
  sophie: { id: 7, name: 'Sophie Leroy', email: 'sophie.leroy@mairie360.fr' },
  thomas: { id: 9, name: 'Thomas Bernard', email: 'thomas.bernard@mairie360.fr' },
};

const contact = (user, extra = {}) => ({
  id: `user-${user.id}`, name: user.name, email: user.email, department: 'Voirie', initials: user.name.split(' ').map((part) => part[0]).join(''), presence: 'online', ...extra,
});

const conversation = (id, name, extra = {}) => ({ id: `conversation-${id}`, name, kind: 'group', initials: name.slice(0, 2).toUpperCase(), unreadCount: 0, ...extra });

const message = (id, conversationId, content, author = users.agent, extra = {}) => ({
  id: `message-${id}`, conversationId: `conversation-${conversationId}`, content, sentAt: '2026-09-15T09:30:00.000Z',
  authorId: `user-${author.id}`, authorName: author.name, direction: author === users.agent ? 'outgoing' : 'incoming', ...extra,
});

/** Réponse `GET /me` : utilisateur courant. */
const currentUser = (extra = {}) => ({
  currentUser: {
    id: `user-${users.agent.id}`, name: users.agent.name, email: users.agent.email, role: 'Responsable', service: 'Voirie', phone: '0102030405', ...extra,
  },
});

const bootstrap = () => ({
  currentUser: currentUser().currentUser,
  conversations: [conversation(4, 'Équipe communication', { unreadCount: 2 }), conversation(5, 'Sophie Leroy', { kind: 'direct' })],
  contacts: [contact(users.sophie), contact(users.thomas)],
  messages: [message(1, 4, 'Bonjour à tous', users.sophie)],
  activeConversationId: 'conversation-4',
});

const businessReferences = () => ({
  references: [
    { id: 'project:42', title: 'Budget participatif', kind: 'project', description: 'Projet' },
    { id: 'event:9', title: 'Conseil municipal', kind: 'event' },
  ],
  sources: { projects: 'available', calendar: 'available' },
});

/** Erreur au format `ApiErrorResponse` du contrat. */
const apiError = (code, text) => ({ code, message: text });

module.exports = {
  apiError, bootstrap, businessReferences, contact, conversation, currentUser, message, messageBffContract, messageBffMock, tokenFor, users,
};
