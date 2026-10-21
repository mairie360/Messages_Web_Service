const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-607: the composer came back from the library with its jsdom tests
// (tests/component/messaging). Node owns coverage, so its drafting flows run here too.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { MessagingComposer } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/ConversationComposers/components/MessagingComposer/MessagingComposer.tsx');

let view;
afterEach(() => {
  view?.unmount();
  view = undefined;
});
const input = (props, _text, tag) => tag === 'input' && props['aria-label'] === 'Écrire un message';
const byAriaLabel = (label) => (props) => props['aria-label'] === label;
const mentionOptions = [{ id: 'u1', name: 'Marie Dubois' }, { id: 'u2', name: 'Pierre Martin' }];
const businessReferenceOptions = [{ id: 'p1', title: 'Projet mairie', kind: 'project' }, { id: 'e1', title: 'Conseil municipal', kind: 'event' }];

test('MAIR-607 the composer completes mentions and business references, appends emojis and sends the draft once', async () => {
  const sent = []; const emojis = []; const values = [];
  view = mount(React.createElement(MessagingComposer, {
    mentionOptions, businessReferenceOptions,
    onValueChange: (value) => values.push(value),
    onEmoji: (emoji) => emojis.push(emoji),
    onSendMessage: (message, attachments, mentions, links) => { sent.push({ message, attachments, mentions, links }); return true; },
  }));
  assert.match(view.html, /aria-label="Envoyer"[^>]*disabled=""/);
  await view.fire(input, 'onChange', { target: { value: 'Bonjour @Dub' } });
  assert.match(view.text(), /Marie Dubois/);
  assert.doesNotMatch(view.text(), /Pierre Martin/);
  await view.click((props, text) => props.type === 'button' && /Marie Dubois/.test(text) && typeof props.onClick === 'function');
  assert.equal(values.at(-1), 'Bonjour @Marie Dubois ');
  await view.fire(input, 'onChange', { target: { value: 'Bonjour @Marie Dubois #Proj' } });
  assert.match(view.text(), /Projet mairie/);
  await view.fire(input, 'onKeyDown', { key: 'Enter' });
  assert.equal(values.at(-1), 'Bonjour @Marie Dubois #Projet mairie ');
  await view.click(byAriaLabel('Ajouter une réaction'));
  await view.click(byAriaLabel('Ajouter 👍'));
  assert.deepEqual(emojis, ['👍']);
  assert.equal(values.at(-1), 'Bonjour @Marie Dubois #Projet mairie 👍');
  assert.doesNotMatch(view.html, /aria-label="Envoyer"[^>]*disabled=""/);
  await view.fire((props, _text, tag) => tag === 'form', 'onSubmit', {});
  assert.equal(sent.length, 1);
  assert.equal(sent[0].message, 'Bonjour @Marie Dubois #Projet mairie 👍');
  assert.deepEqual(sent[0].mentions.map(m => m.id), ['u1']);
  assert.deepEqual(sent[0].links.map(l => l.id), ['p1']);
  assert.equal(values.at(-1), '');
});

test('MAIR-607 the composer keeps the draft when the send is refused and clears it once confirmed', async () => {
  let refuse = true; const sent = [];
  view = mount(React.createElement(MessagingComposer, {
    defaultValue: 'Brouillon à conserver',
    onSendMessage: (message, attachments) => { sent.push({ message, attachments }); return Promise.resolve(!refuse); },
  }));
  await view.fire((props, _text, tag) => tag === 'form', 'onSubmit', {});
  assert.equal(sent.length, 1);
  assert.match(view.html, /value="Brouillon à conserver"/);
  refuse = false;
  await view.fire((props, _text, tag) => tag === 'form', 'onSubmit', {});
  assert.equal(sent.length, 2);
  assert.doesNotMatch(view.html, /value="Brouillon à conserver"/);
});

test('MAIR-607 a disabled composer offers no action', () => {
  view = mount(React.createElement(MessagingComposer, { disabled: true }));
  for (const label of ['Envoyer', 'Joindre un fichier', 'Mentionner un utilisateur', 'Mentionner un élément métier', 'Ajouter une réaction']) {
    assert.match(view.html, new RegExp(`aria-label="${label}"[^>]*disabled=""`), `${label} is disabled`);
  }
});
