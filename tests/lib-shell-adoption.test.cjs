const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// MAIR-578: the shell, its desktop navigation, the page date and the sidebar
// preference all come from the published library; no front keeps a local copy.
test('MAIR-578 the messages shell renders the library shell, not a local copy', () => {
  for (const copy of ['src/components/accessible-shell.tsx', 'src/components/desktop-navigation.tsx', 'src/lib/sidebar-preference.ts']) {
    assert.equal(fs.existsSync(path.join(root, copy)), false, `${copy} must not exist`);
  }
  const page = read('src/app/_components/app-shell.tsx');
  assert.match(page, /import \{ AccessibleShell as SharedAppShell \} from "@mairie360\/lib-components\/shell"/);
  assert.doesNotMatch(page, /@\/components\/(accessible-shell|desktop-navigation)/);
  assert.match(read('src/lib/front-urls-provider.tsx'), /configureSidebarCookieDomain \} from "@mairie360\/lib-components\/shell"/);
  const shell = require('@mairie360/lib-components/shell');
  for (const name of ['AccessibleShell', 'CurrentDate', 'DesktopNavigation', 'SIDEBAR_COOKIE', 'configureSidebarCookieDomain']) assert.ok(name in shell, `shell entry exports ${name}`);
});
