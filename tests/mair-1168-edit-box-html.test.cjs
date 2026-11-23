const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1168: node owns the coverage of every TSX file; the edit box only opens from the hover toolbar of a bubble in
// the jsdom tests, so it is rendered here directly.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const { MessageEditBox } = requireSrc('components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessageThread/components/MessagingMessageBubble/components/MessageEditBox/MessageEditBox.tsx');

let view;
afterEach(() => { view?.unmount(); view = undefined; });
const h = React.createElement;
const message = {
  id: 'message-5', conversationId: 'conversation-4', content: 'Bonjour @Sophie Leroy, voir #Budget', direction: 'outgoing',
  mentions: [{ id: 'user-7', name: 'Sophie Leroy' }], mentionsEveryone: true, groupMentions: [{ id: 'group-3', name: 'Voirie' }],
  links: [{ id: 'project-1', kind: 'project', title: 'Budget', url: 'https://projets.example/projects/1' }],
};
const field = (props, _text, tag) => tag === 'textarea';
const button = label => (props, text) => (text ?? '').trim() === label && typeof props.onClick === 'function';

test('MAIR-1168 « Enregistrer » sends the edited text with the tags still present, and a refusal keeps the text', async () => {
  const saves = [];
  let answer = false;
  view = mount(h(MessageEditBox, { message, initialText: message.content, onSave: payload => { saves.push(payload); return answer; }, onCancel() {} }));
  assert.match(view.text(), /Échap pour annuler · Entrée pour enregistrer/);
  await view.fire(field, 'onChange', { target: { value: 'Bonjour @Sophie Leroy, corrigé' } });
  await view.click(button('Enregistrer'));
  assert.equal(saves.length, 1);
  assert.equal(saves[0].content, 'Bonjour @Sophie Leroy, corrigé');
  assert.deepEqual(saves[0].mentions.map(mention => mention.id), ['user-7']);
  assert.deepEqual(saves[0].businessLinks, []);
  assert.match(view.text(), /Le message n’a pas pu être modifié\./);
  answer = true;
  await view.fire(field, 'onKeyDown', { key: 'Enter', shiftKey: false });
  assert.equal(saves.length, 2);
});

test('MAIR-1168 a rejected save shows its message; Échap cancels; @ and # insert their trigger', async () => {
  let cancelled = 0;
  view = mount(h(MessageEditBox, { message, initialText: message.content, onSave: () => Promise.reject(new Error('Message introuvable.')), onCancel: () => { cancelled++; } }));
  await view.click(props => props['aria-label'] === 'Mentionner une personne' || props.label === 'Mentionner une personne');
  await view.click(props => props['aria-label'] === 'Lier un élément' || props.label === 'Lier un élément');
  assert.match(view.html, /voir #Budget @ ?#/);
  await view.click(button('Enregistrer'));
  assert.match(view.text(), /Message introuvable\./);
  await view.fire(field, 'onKeyDown', { key: 'Escape' });
  assert.equal(cancelled, 1);
});

test('MAIR-1168 an unchanged or blank text cannot be saved', async () => {
  const saves = [];
  view = mount(h(MessageEditBox, { message: { ...message, mentions: undefined, groupMentions: undefined, links: undefined, mentionsEveryone: false }, initialText: 'Texte', onSave: payload => { saves.push(payload); }, onCancel() {} }));
  await view.fire(field, 'onKeyDown', { key: 'Enter', shiftKey: false });
  await view.fire(field, 'onChange', { target: { value: '   ' } });
  await view.fire(field, 'onKeyDown', { key: 'Enter', shiftKey: false });
  assert.equal(saves.length, 0);
});
