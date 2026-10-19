const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { test } = require('node:test');
const { NextRequest } = require('next/server');
const { ROOT, requireSrc } = require('./support/load-ts.cjs');
const yaml = createRequire(require.resolve('@eslint/eslintrc'))('js-yaml');
const { middleware } = requireSrc('middleware.ts');

for (const file of ['docker-compose-security.yml', 'docker-compose-performance.yml']) {
  test(`${file} makes the anonymous frontend readiness probe redirect within test configuration`, () => {
    const service = yaml.load(readFileSync(join(ROOT, file), 'utf8')).services['message-front'];
    const saved = Object.fromEntries(['LOGIN_FRONT_URL', 'MESSAGE_FRONT_URL', 'NODE_ENV'].map(key => [key, process.env[key]]));
    try {
      process.env.NODE_ENV = 'production';
      for (const key of ['LOGIN_FRONT_URL', 'MESSAGE_FRONT_URL']) {
        if (service.environment[key] === undefined) delete process.env[key];
        else process.env[key] = service.environment[key];
      }
      const response = middleware(new NextRequest(service.healthcheck.test.at(-1)));
      assert.equal(response.status, 307);
      const destination = new URL(response.headers.get('location'));
      assert.equal(destination.origin, new URL(service.environment.MESSAGE_FRONT_URL).origin);
      assert.equal(destination.pathname, '/api/auth/resume');
      assert.equal(destination.searchParams.get('next'), '/');
      assert.equal(response.headers.get('set-cookie'), null);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.ok(!service.healthcheck.test.includes('-L'), 'readiness must not follow Login outside the isolated stack');
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
}
