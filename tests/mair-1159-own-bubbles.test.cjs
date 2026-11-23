const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// MAIR-1159: my bubbles use the lib 2.3 tokens message-own/background, /on and /border (no local colour), and the
// text keeps a WCAG contrast of at least 4.5:1 in both themes of the lib.
const styles = fs.readFileSync(require.resolve('@mairie360/lib-components/styles.css'), 'utf8');
const BUBBLE = path.join(__dirname, '../src/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessageThread/components/MessagingMessageBubble');

const luminance = (hex) => {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};
const values = (name) => [...styles.matchAll(new RegExp(`--mairie-${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))].map((match) => match[1]);

test('MAIR-1159 the lib message-own tokens exist and their text contrast is at least 4.5:1', () => {
  const backgrounds = values('message-own-background'), texts = values('message-own-on');
  assert.ok(backgrounds.length >= 1 && backgrounds.length === texts.length);
  assert.equal(backgrounds[0].toLowerCase(), '#efebe2');
  assert.equal(texts[0].toLowerCase(), '#383f51');
  assert.equal(values('message-own-border')[0].toLowerCase(), '#d6d0c3');
  backgrounds.forEach((background, index) => assert.ok(contrast(texts[index], background) >= 4.5, `${texts[index]} on ${background}`));
});

test('MAIR-1159 the bubble and its chips reference the tokens and hold no hard-coded colour', () => {
  for (const file of ['MessagingMessageBubble.tsx', 'components/BubbleReferences/BubbleReferences.tsx', 'components/BubbleAttachments/BubbleAttachments.tsx']) {
    const source = fs.readFileSync(path.join(BUBBLE, file), 'utf8');
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,6}\b|rgb\(/, `${file} holds a hard-coded colour`);
    assert.doesNotMatch(source, /on-action/, `${file} still uses the action colour for my messages`);
  }
  const bubble = fs.readFileSync(path.join(BUBBLE, 'MessagingMessageBubble.tsx'), 'utf8');
  for (const token of ['message-own-background', 'message-own-on', 'message-own-border']) assert.match(bubble, new RegExp(`var\\(--mairie-${token}\\)`));
});
