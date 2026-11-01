const { assertPublishedSharedUi } = require('./helpers/published-shared-ui.cjs');
const sharedUiReleases = require('./fixtures/shared-ui-releases.json');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AppShell, Footer } = require('@mairie360/lib-components/shell');

function shellDocument(t, props = {}) {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(AppShell, {
    user: { name: '' }, hrefs: { projects: 'https://projects.example/' }, ...props,
  }, React.createElement('p', null, 'Contenu du module'))));
  t.after(() => dom.window.close());
  return dom.window.document;
}

test('the installed shared UI matches the reviewed published artifact', () => {
  assertPublishedSharedUi(join(__dirname, '..'), sharedUiReleases);
});

test('the shared shell keeps sidebar information distinct from a contentinfo landmark and has one skip target', t => {
  const document = shellDocument(t, { footerProps: { year: 2026 } });
  const sidebar = document.querySelector('aside');
  assert.match(sidebar.textContent, /© 2026 Mairie360/);
  assert.equal(sidebar.querySelectorAll('footer, [role="contentinfo"]').length, 0);
  assert.doesNotMatch(document.body.textContent, /Version|Utilisateur/);
  assert.match(document.body.textContent, /Contenu du module/);
  const skip = [...document.querySelectorAll('a')].filter(link => link.textContent.trim() === 'Aller au contenu');
  assert.equal(skip.length, 1);
  assert.equal(document.querySelector(skip[0].getAttribute('href')), document.querySelector('main'));
  assert.equal(document.querySelector('main').tabIndex, -1);
});

test('standalone Footer retains its horizontal contentinfo landmark', () => {
  const html = renderToStaticMarkup(React.createElement(Footer, { year: 2026 }));
  assert.match(html, /<footer\b[^>]*role="contentinfo"/);
  assert.match(html, /border-t/);
});

test('supplied product, year, real version and actionable links remain in sidebar information', t => {
  const document = shellDocument(t, { footerProps: {
    productName: 'Produit fourni', year: 2024, version: '0.6.11',
    links: [{ label: 'Documentation', href: 'https://docs.example/' }],
  } });
  const sidebar = document.querySelector('aside');
  assert.match(sidebar.textContent, /© 2024 Produit fourni/);
  assert.match(sidebar.textContent, /Version 0\.6\.11/);
  assert.equal(sidebar.querySelector('a[href="https://docs.example/"]').textContent, 'Documentation');
  assert.equal(sidebar.querySelectorAll('footer, [role="contentinfo"]').length, 0);
  assert.doesNotMatch(document.body.textContent, /Utilisateur/);
});

test('an explicitly requested content footer has the sole contentinfo landmark outside the sidebar', t => {
  const document = shellDocument(t, { footerPlacement: 'content', footerProps: { year: 2026 } });
  const footer = document.querySelector('footer');
  assert.equal(footer.getAttribute('role'), 'contentinfo');
  assert.equal(document.querySelectorAll('[role="contentinfo"]').length, 1);
  assert.equal(document.querySelector('main').nextElementSibling, footer);
  assert.equal(footer.closest('aside'), null);
});
