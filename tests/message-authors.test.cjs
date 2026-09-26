const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MessagingMessageBubble } = require('@mairie360/lib-components');
const { requireSrc } = require('./support/load-ts.cjs');
const { buildMessageMentionOptions, presentMessageAuthors } = requireSrc('lib/message-authors.tsx');

const contacts = [{ id: 'user-7', name: 'Sophie Leroy', kind: 'direct' }];
const conversations = [{ id: 'conversation-4', name: 'Équipe communication', kind: 'group' }];
const references = [{ id: 'project:42', title: 'Budget participatif', kind: 'project' }];
const options = buildMessageMentionOptions(contacts, conversations);
const render = (message) => renderToStaticMarkup(React.createElement(MessagingMessageBubble, { message }));

test('renders the contract author and preserves mention highlighting and source content', () => {
  const source = Object.freeze({
    id: 'message-1',
    conversationId: 'conversation-4',
    content: 'Bonjour @Sophie Leroy, voir #Budget participatif.',
    authorId: 'user-7',
    authorName: ' Sophie Leroy ',
    direction: 'incoming',
  });
  const [displayed] = presentMessageAuthors([source], 'user-2', options, references);
  const html = render(displayed);

  assert.match(html, /data-message-author="user-7"[^>]*>Sophie Leroy<\/span>/);
  assert.match(html, /data-mention-kind="user">@Sophie Leroy<\/strong>/);
  assert.match(html, /data-mention-kind="business">#Budget participatif<\/strong>/);
  assert.equal(source.content, 'Bonjour @Sophie Leroy, voir #Budget participatif.');
  assert.notEqual(displayed, source);
});

test('marks only the current user as self and does not infer missing identities', () => {
  const outgoing = Object.freeze({ id: 'message-2', content: 'Bonjour', authorId: 'user-2', authorName: 'Agent Mairie' });
  const unnamed = Object.freeze({ id: 'message-3', content: 'Sans nom', authorId: 'user-9', authorName: '  ' });
  const [displayedOutgoing, displayedUnnamed] = presentMessageAuthors([outgoing, unnamed], 'user-2', [], []);

  assert.match(render(displayedOutgoing), /Agent Mairie \(vous\)/);
  assert.equal(displayedUnnamed, unnamed);
  assert.doesNotMatch(render(displayedUnnamed), /data-message-author|Expéditeur inconnu/);
});

test('preserves mention boundaries, React content, references and attachments', () => {
  const attachment = { id: 'attachment-1', name: 'notice.txt', url: '/attachment-1' };
  const content = 'Bonjour @Sophie Leroyx et @Sophie Leroy';
  const source = Object.freeze({
    id: 'message-4', content, authorName: 'Thomas', authorId: 'user-9',
    attachments: [attachment], businessLinks: references,
  });
  const [displayed] = presentMessageAuthors([source], 'user-2', options, []);
  const html = render(displayed);

  assert.match(html, /@Sophie Leroyx et <strong[^>]*data-mention-kind="user">@Sophie Leroy<\/strong>/);
  assert.match(html, /notice\.txt/);
  assert.match(html, /Budget participatif/);
  assert.equal(displayed.attachments, source.attachments);
  assert.equal(displayed.businessLinks, source.businessLinks);

  const rich = React.createElement('em', null, 'Texte riche');
  const [richMessage] = presentMessageAuthors([{ id: 'message-5', content: rich, authorName: 'Sophie' }], 'user-2', [], []);
  assert.equal(renderToStaticMarkup(richMessage.content).includes('<em>Texte riche</em>'), true);
});
