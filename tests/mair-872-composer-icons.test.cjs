const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const COMPOSER = path.join(__dirname, '../src/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/ConversationComposers/components/MessagingComposer');
// MAIR-1166: the suggestions of the composer are the shared MentionSuggestions (also used by the edit box).
const SUGGESTIONS = path.join(COMPOSER, '../../../MentionSuggestions');
const sources = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return sources(full);
  return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : [];
});

test('MAIR-872 the composer renders lucide glyphs only through the lib Icon, without hard-coded size or stroke', () => {
  const files = [...sources(COMPOSER), ...sources(SUGGESTIONS)];
  assert.ok(files.length > 4);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = path.relative(COMPOSER, file);
    assert.doesNotMatch(source, /strokeWidth/, `${name} sets a stroke width`);
    const glyphs = (source.match(/import \{([^}]*)\} from 'lucide-react';/)?.[1] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    for (const glyph of glyphs) {
      assert.doesNotMatch(source, new RegExp(`<${glyph}\\b`), `${name} renders <${glyph}> directly`);
      // MAIR-1158: a lib IconButton renders its glyph through the lib Icon too.
      assert.match(source, new RegExp(`<(Icon|IconButton)\\b[^>]*\\bicon=\\{${glyph}\\}`), `${name} imports ${glyph} without an Icon`);
    }
  }
});

test('MAIR-1158 MAIR-1253 the composer actions use the artifact lib glyphs (file-up, user-round, link, smile-plus) on lib icon buttons and the lib « Envoyer » button', () => {
  const toolbar = fs.readFileSync(path.join(COMPOSER, 'components/ComposerToolbar/ComposerToolbar.tsx'), 'utf8');
  for (const glyph of ["icons['file-up']", "icons['user-round']", 'icons.link', "icons['smile-plus']"]) assert.ok(toolbar.includes(`icon={${glyph}}`), glyph);
  assert.doesNotMatch(toolbar, /<button\b/);
  const composer = fs.readFileSync(path.join(COMPOSER, 'MessagingComposer.tsx'), 'utf8');
  assert.match(composer, /<SendButton type="submit" label=\{sendLabel\}/);
});
