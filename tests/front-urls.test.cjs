const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');

const frontUrls = requireSrc('lib/front-urls.ts');
const { FrontUrlsProvider } = requireSrc('lib/front-urls-provider.tsx');
const navigation = requireSrc('lib/navigation.ts');

// The other fronts' URLs are read at runtime (src/lib/front-urls.ts): from the server environment the
// Helm chart injects, and in the browser from what the root layout hands to FrontUrlsProvider.

const saved = { LOGIN_FRONT_URL: process.env.LOGIN_FRONT_URL, DASHBOARD_FRONT_URL: process.env.DASHBOARD_FRONT_URL };

afterEach(() => {
  delete global.window;
  frontUrls.setBrowserFrontUrls({});
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('the server reads the URLs from the runtime environment, trimmed, and skips empty ones', () => {
  process.env.DASHBOARD_FRONT_URL = '  https://dashboard.test.example/  ';
  process.env.LOGIN_FRONT_URL = ' ';

  const urls = frontUrls.readFrontUrlsFromEnv();
  assert.equal(urls.DASHBOARD_FRONT_URL, 'https://dashboard.test.example/');
  assert.equal(Object.hasOwn(urls, 'LOGIN_FRONT_URL'), false);
  assert.equal(frontUrls.frontUrl('DASHBOARD_FRONT_URL'), 'https://dashboard.test.example/');
  assert.equal(frontUrls.frontUrl('LOGIN_FRONT_URL'), undefined);
});

test('the browser only sees what the root layout handed to FrontUrlsProvider', () => {
  process.env.DASHBOARD_FRONT_URL = 'https://server-only.test.example/';
  global.window = {};
  assert.equal(frontUrls.frontUrl('DASHBOARD_FRONT_URL'), undefined);

  const children = Symbol('children');
  assert.equal(FrontUrlsProvider({ urls: { DASHBOARD_FRONT_URL: 'https://dashboard.test.example/' }, children }), children);
  assert.equal(frontUrls.frontUrl('DASHBOARD_FRONT_URL'), 'https://dashboard.test.example/');
});

test('the provider leaves the browser store alone when rendered on the server', () => {
  FrontUrlsProvider({ urls: { DASHBOARD_FRONT_URL: 'https://ignored.test.example/' }, children: null });
  global.window = {};
  assert.equal(frontUrls.frontUrl('DASHBOARD_FRONT_URL'), undefined);
});

test('navigation resolves every other front on use, from the URLs of this instance', () => {
  global.window = {};
  assert.equal(navigation.getAppRoute('dashboard'), undefined, 'nothing configured yet');

  const urls = {
    DASHBOARD_FRONT_URL: 'https://dashboard.test.example/',
    PROJECT_FRONT_URL: 'https://project.test.example/',
    MESSAGE_FRONT_URL: 'https://message.test.example/',
    EMAIL_FRONT_URL: 'https://email.test.example/',
    FILES_FRONT_URL: 'https://files.test.example/',
    ELEARNING_FRONT_URL: 'https://elearning.test.example/',
    CALENDAR_FRONT_URL: 'https://calendar.test.example/',
    ADMINISTRATION_FRONT_URL: 'https://admin.test.example/',
    SETTINGS_FRONT_URL: 'https://settings.test.example/',
  };
  frontUrls.setBrowserFrontUrls(urls);
  const expected = {
    dashboard: urls.DASHBOARD_FRONT_URL,
    projects: urls.PROJECT_FRONT_URL,
    messages: urls.MESSAGE_FRONT_URL,
    emails: urls.EMAIL_FRONT_URL,
    files: urls.FILES_FRONT_URL,
    training: urls.ELEARNING_FRONT_URL,
    calendar: urls.CALENDAR_FRONT_URL,
    admin: urls.ADMINISTRATION_FRONT_URL,
    settings: urls.SETTINGS_FRONT_URL,
  };
  for (const [page, href] of Object.entries(expected)) assert.equal(navigation.getAppRoute(page), href, page);
  assert.equal(navigation.getAppRoute('profile'), urls.SETTINGS_FRONT_URL);
  frontUrls.setBrowserFrontUrls({ SETTINGS_FRONT_URL: 'https://settings.test.example/profile' });
  assert.equal(navigation.getAppRoute('profile'), '/profile');
  frontUrls.setBrowserFrontUrls({ SETTINGS_FRONT_URL: 'javascript:alert(1)' });
  assert.equal(navigation.getAppRoute('profile'), '/profile');
});
