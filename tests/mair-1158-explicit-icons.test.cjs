const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// MAIR-1158: every icon of the messaging module comes from the lib `Icon` (directly or through a lib
// IconButton / Button `icon` prop); no lucide glyph is rendered as an element of its own.
const MESSAGING = path.join(__dirname, '../src/components/MessagesPage/components/MessagesWorkspace/components/Messaging');
const sources = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return sources(full);
  return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : [];
});

test('MAIR-1158 the messaging module renders lucide glyphs only through the lib Icon', () => {
  const files = sources(MESSAGING);
  assert.ok(files.length > 20);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = path.relative(MESSAGING, file);
    assert.doesNotMatch(source, /strokeWidth/, `${name} sets a stroke width`);
    const glyphs = [...source.matchAll(/import \{([^}]*)\} from 'lucide-react';/g)].flatMap((match) => match[1].split(','))
      .map((item) => item.replace(/^type\s+/, '').trim()).filter((item) => item && item !== 'LucideIcon');
    for (const glyph of glyphs) {
      assert.doesNotMatch(source, new RegExp(`<${glyph}\\b`), `${name} renders <${glyph}> directly`);
    }
  }
});

test('MAIR-1158 header, menus and linked elements use the explicit glyphs of the ticket', () => {
  const read = (file) => fs.readFileSync(path.join(MESSAGING, file), 'utf8');
  const header = read('components/MessagingChatHeader/MessagingChatHeader.tsx');
  assert.match(header, /icon=\{Phone\} unavailable/); assert.match(header, /icon=\{Video\} unavailable/);
  assert.match(header, /icons\['text-search'\]/);
  assert.match(read('components/MessagingChatHeader/components/ConversationActionsMenu/ConversationActionsMenu.tsx'), /MoreHorizontal[\s\S]*icons\['check-check'\][\s\S]*icon=\{Trash\}/);
  const menu = read('components/MessagingSidebar/components/SidebarHeader/components/NewConversationMenu/NewConversationMenu.tsx');
  assert.match(menu, /icons\['message-square-plus'\]/); assert.match(menu, /icon=\{Users\}/);
  const kinds = read('components/BusinessReferenceIcon/BusinessReferenceIcon.tsx');
  for (const glyph of ["icons['folder-kanban']", "icons['list-checks']", "icons['folder-open']", 'Calendar', "icons['building-2']"]) assert.ok(kinds.includes(glyph), glyph);
});
