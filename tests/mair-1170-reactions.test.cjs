const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');

// MAIR-1170: the Node coverage gates the `.tsx` files it loads too: the reaction picker and the reaction pills.
globalThis.window ??= {};
installReactRuntime();
const React = require('react');
const BUBBLE = 'components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessageThread/components/MessagingMessageBubble/components';
const { ReactionPicker, REACTION_EMOJIS } = requireSrc(`${BUBBLE}/ReactionPicker/ReactionPicker.tsx`);
const { MessageReactions, reactionLabel, reactionNames } = requireSrc(`${BUBBLE}/MessageReactions/MessageReactions.tsx`);
let view;
afterEach(() => { view?.unmount(); view = undefined; });

test('MAIR-1170 the picker offers the seven reactions and closes on Échap', async () => {
  const picked = [];
  let closed = 0;
  view = mount(React.createElement(ReactionPicker, { outgoing: true, onPick: emoji => picked.push(emoji), onClose: () => { closed += 1; } }));
  assert.equal(REACTION_EMOJIS.length, 7);
  for (const emoji of REACTION_EMOJIS) assert.ok(view.html.includes(emoji));
  await view.click(props => props['aria-label'] === 'Réagir avec fête');
  assert.deepEqual(picked, ['🎉']);
  await view.fire(props => props.role === 'group', 'onKeyDown', { key: 'Escape' });
  await view.fire(props => props.role === 'group', 'onKeyDown', { key: 'ArrowRight' });
  assert.equal(closed, 1);
});

test('MAIR-1170 a pill is a toggle named « 👍 3, dont vous » with the names in its tooltip', async () => {
  const toggled = [];
  let added = 0;
  const reactions = [{ emoji: '👍', count: 3, reactedByMe: true, userNames: ['Moi', 'Sophie'] }];
  view = mount(React.createElement(MessageReactions, { reactions, outgoing: false, onToggle: reaction => toggled.push(reaction.emoji), onAdd: () => { added += 1; } }));
  assert.match(view.html, /aria-pressed="true"/);
  assert.match(view.html, /aria-label="👍 3, dont vous"/);
  await view.click(props => props['aria-label'] === '👍 3, dont vous');
  await view.click(props => props['aria-label'] === 'Ajouter une réaction');
  assert.deepEqual([toggled, added], [['👍'], 1]);
  assert.equal(reactionLabel({ emoji: '👀', count: 1, reactedByMe: false, userNames: [] }), '👀 1');
  assert.equal(reactionNames({ emoji: '👀', count: 3, reactedByMe: false, userNames: ['A', 'B'] }), 'A, B et 1 autre');
});
