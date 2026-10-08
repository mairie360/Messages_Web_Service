const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const read = file => readFileSync(join(__dirname, '..', file), 'utf8');
const digest = '0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6';
const workflow = () => yaml.load(read('.github/workflows/cicd.yml'));

test('production and development install the lock with a required ephemeral secret and readonly npm policy', () => {
  for (const file of ['Dockerfile', 'development.Dockerfile']) {
    const dockerfile = read(file);
    assert.match(dockerfile, /^# syntax=docker\/dockerfile:1$/m);
    assert.doesNotMatch(dockerfile, /^(ARG|ENV)\s+NODE_AUTH_TOKEN\b/m);
    assert.doesNotMatch(dockerfile, /echo.*(_authToken|NODE_AUTH_TOKEN)|npm config set|\bnpm install\b|\/run\/secrets/);
    assert.match(dockerfile, /RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN,required=true \\\n\s+--mount=type=bind,source=\.npmrc,target=\/app\/\.npmrc \\\n\s+npm ci\s*\n/);
    assert.equal([...dockerfile.matchAll(/\bnpm ci\b/g)].length, 1);
  }
  assert.match(read('.npmrc'), /^\/\/npm\.pkg\.github\.com\/:_authToken=\$\{NODE_AUTH_TOKEN\}$/m);
  assert.match(read('.npmrc'), /^min-release-age=7$/m);
  assert.match(read('.npmrc'), /^min-release-age-exclude\[\]=@mairie360\/lib-components$/m);
});

test('production, development and both consumer workflows pin the same exact official Node LTS', () => {
  for (const file of ['Dockerfile', 'development.Dockerfile']) {
    const dockerfile = read(file);
    assert.match(dockerfile, /^ARG NODE_VERSION=24\.21\.0$/m);
    const images = [...dockerfile.matchAll(/^FROM node:\$\{NODE_VERSION\}-bookworm-slim@sha256:([a-f0-9]{64}) AS ([\w-]+)$/gm)];
    assert.deepEqual(images.map(([, sha]) => sha), file === 'Dockerfile' ? [digest, digest] : [digest]);
  }
  assert.equal(workflow().jobs.CICD.with.node_version, '24.21.0');
  assert.match(read('.github/workflows/contracts.yml'), /node-version: '24\.21\.0'/);
});

test('production keeps the non-root standalone Node and curl runtime without unused package managers', () => {
  const dockerfile = read('Dockerfile');
  const runner = dockerfile.split('FROM runtime-base AS runner\n')[1];
  assert.ok(runner);
  assert.match(runner, /^USER nextjs$/m);
  assert.match(runner, /^ENV PORT=5003$/m);
  assert.match(runner, /^CMD \["node", "server\.js"\]$/m);
  assert.doesNotMatch(runner, /NODE_AUTH_TOKEN|\.npmrc|npm|yarn|corepack|COPY \. \./);
  assert.match(dockerfile, /rm -rf \/usr\/local\/lib\/node_modules\/npm \/usr\/local\/lib\/node_modules\/corepack \/opt\/yarn-v1\.22\.22/);
  assert.match(dockerfile, /rm -f \/usr\/local\/bin\/npm \/usr\/local\/bin\/npx \/usr\/local\/bin\/corepack \/usr\/local\/bin\/yarn \/usr\/local\/bin\/yarnpkg/);
  const dev = read('development.Dockerfile');
  assert.match(dev, /^USER nextjs$/m);
  assert.match(dev, /^ENV NODE_ENV=development$/m);
  assert.match(dev, /^CMD \["npm", "run", "dev"\]$/m);
});

test('Docker excludes local environments and artifacts while retaining tracked npm policy', () => {
  const patterns = read('.dockerignore').split(/\r?\n/).map(line => line.trim());
  for (const item of ['node_modules', '.next', '.git', '.env*', '.npmrc.*', 'cicd-repo', 'coverage', 'test-results', 'playwright-report']) assert.ok(patterns.includes(item), item);
  assert.ok(!patterns.includes('.npmrc') && !patterns.includes('.npmrc*'));
});

test('all three Compose frontend builds use the required secret without runtime credentials', () => {
  for (const file of ['docker-compose.yml', 'docker-compose-security.yml', 'docker-compose-performance.yml']) {
    const compose = yaml.load(read(file));
    assert.deepEqual(compose.secrets, { node_auth_token: { environment: 'NODE_AUTH_TOKEN' } });
    assert.deepEqual(compose.services['message-front'].build, {
      context: '.', dockerfile: file === 'docker-compose.yml' ? 'development.Dockerfile' : 'Dockerfile', secrets: ['node_auth_token'],
    });
    for (const [name, service] of Object.entries(compose.services)) {
      assert.ok(!service.secrets, `${name}: no runtime secret`);
      assert.ok(!service.environment || !Object.hasOwn(service.environment, 'NODE_AUTH_TOKEN'), `${name}: no runtime token`);
      if (name !== 'message-front') assert.ok(!service.build, `${name}: unchanged existing image`);
    }
  }
});

test('the exact required legacy status executes both real blocking scanners without extra access', () => {
  const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
  assert.deepEqual(workflow().jobs.required_security_scan, {
    name: 'CICD / Code Security Audit (Semgrep)',
    'runs-on': 'ubuntu-latest', 'timeout-minutes': 20, permissions: { contents: 'read' },
    steps: [
      { name: 'Checkout frontend history', uses: checkout, with: { 'fetch-depth': 0, 'persist-credentials': false } },
      { name: 'Checkout reviewed scanner actions', uses: checkout, with: {
        repository: 'mairie360/CICD', ref: '539847726d4058a9565c4f682c2d1d8302874b06', path: 'cicd-repo', 'persist-credentials': false,
      } },
      { name: 'Run blocking Semgrep scan', uses: './cicd-repo/actions/semgrep', with: {
        config: 'p/typescript p/react p/owasp-top-ten p/secrets p/dockerfile p/github-actions', fail_on_findings: 'true', artifact_name: 'semgrep-required-check-sarif',
      } },
      { name: 'Run blocking redacted Gitleaks scan', uses: './cicd-repo/actions/gitleaks', with: { fail_on_findings: 'true' } },
    ],
  });
});

test('the reusable frontend workflow retains blocking defaults and only declared secrets', () => {
  assert.deepEqual(workflow().jobs.CICD, {
    uses: 'mairie360/CICD/.github/workflows/frontend-cicd.yml@v4.2.0',
    with: { package_name: 'message-front', node_version: '24.21.0', cicd_version: 'v4.2.0' },
    secrets: { CODECOV_TOKEN: '${{ secrets.CODECOV_TOKEN }}', N8N_WEBHOOK_SECRET: '${{ secrets.N8N_WEBHOOK_SECRET }}' },
  });
  assert.doesNotMatch(read('.github/workflows/cicd.yml'), /secrets:\s*inherit|continue-on-error:|image_scan_fail_on_findings:|semgrep_fail_on_findings:\s*false/);
});

test('the required scan runs for every existing event without changing global permissions', () => {
  const ci = workflow();
  assert.deepEqual(ci.on, { push: null, pull_request: null, workflow_dispatch: null });
  assert.deepEqual(ci.permissions, { contents: 'write', packages: 'write', 'id-token': 'write' });
  assert.deepEqual(Object.keys(ci.jobs).sort(), ['CICD', 'required_security_scan']);
});
