const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const COMPOSER = path.join(__dirname, '../src/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/ConversationComposers/components/MessagingComposer');
const sources = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return sources(full);
  return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : [];
});

test('MAIR-872 the composer renders lucide glyphs only through the lib Icon, without hard-coded size or stroke', () => {
  const files = sources(COMPOSER);
  assert.ok(files.length > 4);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = path.relative(COMPOSER, file);
    assert.doesNotMatch(source, /strokeWidth/, `${name} sets a stroke width`);
    const glyphs = (source.match(/import \{([^}]*)\} from 'lucide-react';/)?.[1] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    for (const glyph of glyphs) {
      assert.doesNotMatch(source, new RegExp(`<${glyph}\\b`), `${name} renders <${glyph}> directly`);
      assert.match(source, new RegExp(`<Icon icon=\\{${glyph}\\}`), `${name} imports ${glyph} without an Icon`);
    }
  }
});
