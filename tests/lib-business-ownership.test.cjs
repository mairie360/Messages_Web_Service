const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

// MAIR-607: the library keeps only components shared by several fronts. The
// messaging workspace and its sub-components are Messages' own code now.
test('MAIR-607 the messaging front owns its components instead of importing a library entry', () => {
  for (const file of walk(path.join(root, 'src'))) {
    if (!/\.(tsx?|mjs|cjs|js)$/.test(file)) continue;
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /@mairie360\/lib-components\/(dashboard|settings|projects|messages|calendar|admin|elearning)/, `${path.relative(root, file)} must not import a removed library entry`);
  }
  for (const component of ['Messaging', 'MessagingSidebar', 'MessagingChatHeader', 'MessagingComposer', 'MessagingMessageBubble', 'NewMessageModal', 'CreateGroupModal']) {
    assert.ok(fs.existsSync(path.join(root, 'src/components/messaging', `${component}.tsx`)), `${component} lives in src/components/messaging`);
    assert.match(read('src/components/messaging/index.ts'), new RegExp(`export \\{ ${component} \\}`));
  }
  for (const file of ['src/app/_components/messages-workspace.tsx', 'src/app/_components/use-messaging-controller.ts', 'src/lib/messaging-state.ts', 'src/lib/message-authors.tsx']) assert.match(read(file), /"@\/components\/messaging"/, `${file} imports the local messaging module`);
});

test('MAIR-607 the installed library no longer publishes a messages entry', () => {
  const pkg = JSON.parse(read('node_modules/@mairie360/lib-components/package.json'));
  assert.equal(pkg.exports['./messages'], undefined, 'the installed lib-components must not expose ./messages (bump the pin to the MAIR-607 major)');
  assert.ok(pkg.exports['./primitives'] && pkg.exports['./shell'], 'primitives and shell entries remain');
});
