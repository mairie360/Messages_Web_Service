const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const read = file => readFileSync(join(__dirname, '..', file), 'utf8');
const cicdCommit = /frontend-cicd\.yml@([a-f0-9]{40})/.exec(read('.github/workflows/cicd.yml'))[1];
const digest = '55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205';
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
    assert.match(dockerfile, /^ARG NODE_VERSION=24\.22\.1$/m);
    const images = [...dockerfile.matchAll(/^FROM node:\$\{NODE_VERSION\}-bookworm-slim@sha256:([a-f0-9]{64}) AS ([\w-]+)$/gm)];
    assert.deepEqual(images.map(([, sha]) => sha), file === 'Dockerfile' ? [digest, digest] : [digest]);
  }
  assert.equal(workflow().jobs.CICD.with.node_version, '24.22.1');
  assert.match(read('.github/workflows/contracts.yml'), /node-version: '24\.22\.1'/);
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
  for (const item of ['node_modules', '.next', '.git', '.env*', '.npmrc.*', 'cicd-repo', 'rgaa-report', '.rgaa-ai-cache', 'rgaa.yaml', 'accessibility_test.sh', 'init-accessibility.sql', 'coverage', 'test-results', 'playwright-report']) assert.ok(patterns.includes(item), item);
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
        repository: 'mairie360/CICD', ref: '82eeb666ba060b14b272520c3b3a3f4cd94410c7', path: 'cicd-repo', 'persist-credentials': false,
      } },
      { name: 'Run blocking Semgrep scan', uses: './cicd-repo/actions/security/semgrep-pypi', with: {
        config: 'p/typescript p/react p/owasp-top-ten p/secrets p/dockerfile p/github-actions', fail_on_findings: 'true', artifact_name: 'semgrep-required-check-sarif',
      } },
      { name: 'Run blocking redacted Gitleaks scan', uses: './cicd-repo/actions/security/gitleaks-binary', with: { fail_on_findings: 'true' } },
    ],
  });
});

test('the reusable frontend workflow retains blocking defaults and only declared secrets', () => {
  assert.deepEqual(workflow().jobs.CICD, {
    permissions: { contents: 'write', packages: 'write', 'id-token': 'write' },
    uses: `mairie360/CICD/.github/workflows/frontend-cicd.yml@${cicdCommit}`,
    with: { package_name: 'message-front', node_version: '24.22.1', cicd_version: cicdCommit },
    secrets: {
      CODECOV_TOKEN: '${{ secrets.CODECOV_TOKEN }}',
      N8N_WEBHOOK_SECRET: '${{ secrets.N8N_WEBHOOK_SECRET }}',
      ANTHROPIC_API_KEY: '${{ secrets.ANTHROPIC_API_KEY }}',
      RELEASE_APP_ID: '${{ secrets.RELEASE_APP_ID }}',
      RELEASE_APP_PK: '${{ secrets.RELEASE_APP_PK }}',
    },
  });
  assert.doesNotMatch(read('.github/workflows/cicd.yml'), /secrets:\s*inherit|continue-on-error:|image_scan_fail_on_findings:|semgrep_fail_on_findings:\s*false/);
});

test('the required scan runs for every existing event with a read-only default token', () => {
  const ci = workflow();
  // MAIR-436: push runs on main only and the workflow token is read-only by default.
  assert.deepEqual(ci.on, { push: { branches: ['main'] }, pull_request: null, workflow_dispatch: null });
  assert.deepEqual(ci.permissions, { contents: 'read' });
  assert.deepEqual(Object.keys(ci.jobs).sort(), ['CICD', 'required_security_scan']);
});

test('MAIR-316: the RGAA stack runs the image under test and the script builds it with a secret only', () => {
  const compose = read('docker-compose-accessibility.yml');
  const frontend = compose.split('  message-front:\n')[1]?.split('\n  a11y:')[0];
  assert.ok(frontend, 'docker-compose-accessibility.yml must keep the frontend service');
  // promote-prod.yml exports IMAGE_REF=<image>@<staging digest>: the stack never rebuilds it.
  assert.match(frontend, /image: \$\{IMAGE_REF:\?/);
  assert.doesNotMatch(frontend, /build:|args:|NODE_AUTH_TOKEN|\/run\/secrets/);
  const code = compose.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n');
  assert.doesNotMatch(code, /NODE_AUTH_TOKEN|\bbuild-arg\b/);
  // The ZAP / k6 data stay as they are: the RGAA states get their own seed, loaded after it.
  assert.match(compose, /- \.\/init-test\.sql:\/init-test\.sql:ro/);
  assert.match(compose, /- \.\/init-accessibility\.sql:\/init-accessibility\.sql:ro/);
  for (const file of ['docker-compose-security.yml', 'docker-compose-performance.yml']) {
    assert.doesNotMatch(read(file), /init-accessibility\.sql|IMAGE_REF/, file);
  }
  const shell = read('accessibility_test.sh');
  assert.match(shell, /docker build -t message-front:local --secret id=node_auth_token,env=NODE_AUTH_TOKEN \./);
  assert.doesNotMatch(shell, /--build-arg|up -d --build/);
});

test('MAIR-316: the RGAA seed users have no plaintext password (chk_users_password_hashed)', () => {
  // Comments out, then every `INSERT INTO users (columns) VALUES (...), (...)`: the password column
  // (wherever it sits) must be NULL or an argon2id hash.
  const seed = read('init-accessibility.sql').replace(/--[^\n]*/g, '');
  const inserts = [...seed.matchAll(/INSERT INTO users \(([^)]*)\)\s*VALUES([\s\S]*?)(?:ON CONFLICT|;)/g)];
  assert.ok(inserts.length > 0, 'init-accessibility.sql must insert its users');
  for (const [, columns, values] of inserts) {
    const index = columns.split(',').map((column) => column.trim()).indexOf('password');
    assert.ok(index >= 0, 'the users insert names the password column');
    for (const [row] of values.matchAll(/\([^()]*\)/g)) {
      const password = row.slice(1, -1).split(',')[index]?.trim();
      assert.ok(password === 'NULL' || /^'\$argon2id\$/.test(password), `password must be NULL or an argon2id hash: ${row}`);
    }
  }
});

test('MAIR-316: accessibility_test.sh fetches the RGAA engine at a pinned commit SHA, not only a tag', () => {
  const shell = read('accessibility_test.sh');
  // `git clone --branch` refuses a SHA, and cicd.yml pins mairie360/CICD by SHA.
  assert.doesNotMatch(shell, /git clone[^\n]*--branch/);
  assert.match(shell, /git -C "\$CICD_DIR" fetch --quiet --depth 1 https:\/\/github\.com\/mairie360\/CICD "\$CICD_VERSION"/);
  assert.match(shell, /checkout --quiet FETCH_HEAD/);
});

test('MAIR-316: promote-prod passes the secrets of the RGAA AI pre-audit by name', () => {
  const workflow = read('.github/workflows/promote-prod.yml');
  assert.doesNotMatch(workflow, /secrets:\s*inherit/);
  assert.match(workflow, /^\s+stack: fronts\s*$/m);
  for (const name of ['ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']) {
    assert.match(workflow, new RegExp(`^ {6}${name}: \\$\\{\\{ secrets\\.${name} \\}\\}\\s*$`, 'm'), name);
  }
});

test('MAIR-316: a local engine copy is fetched again when the cicd_version pin changes', () => {
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync: readAbs, existsSync, rmSync } = require('node:fs');
  const { execFileSync } = require('node:child_process');
  const { tmpdir } = require('node:os');
  const shell = read('accessibility_test.sh');
  const block = shell.slice(shell.indexOf('CICD_DIR="cicd-repo"'), shell.indexOf('A11Y_RUNNER_IMAGE="$(cat'));
  const run = (setup, githubActions = '') => {
    const dir = mkdtempSync(join(tmpdir(), 'rgaa-ref-'));
    try {
      mkdirSync(join(dir, '.github/workflows'), { recursive: true });
      writeFileSync(join(dir, '.github/workflows/cicd.yml'), '      cicd_version: "new-sha" # v9.9.9\n');
      mkdirSync(join(dir, 'bin'));
      // Fake git: records the calls; `checkout` lays out the engine like a real fetch would.
      writeFileSync(join(dir, 'bin/git'), '#!/bin/sh\necho "$*" >> "$LOG"\ncase "$*" in *checkout*) mkdir -p cicd-repo/tests/a11y && touch cicd-repo/tests/a11y/run.sh;; esac\n', { mode: 0o755 });
      setup(dir);
      execFileSync('bash', ['-c', block], { cwd: dir, env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, LOG: join(dir, 'git.log'), CICD_VERSION: '', GITHUB_ACTIONS: githubActions } });
      const log = existsSync(join(dir, 'git.log')) ? readAbs(join(dir, 'git.log'), 'utf8') : '';
      const ref = existsSync(join(dir, 'cicd-repo/.rgaa-ref')) ? readAbs(join(dir, 'cicd-repo/.rgaa-ref'), 'utf8').trim() : null;
      return { log, ref };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const engine = (dir, ref) => {
    mkdirSync(join(dir, 'cicd-repo/tests/a11y'), { recursive: true });
    writeFileSync(join(dir, 'cicd-repo/tests/a11y/run.sh'), '');
    if (ref) writeFileSync(join(dir, 'cicd-repo/.rgaa-ref'), `${ref}\n`);
  };
  // No copy: fetched at the pin, which is recorded.
  assert.deepEqual(run(() => {}).ref, 'new-sha');
  // A copy fetched for an older pin: fetched again.
  const stale = run((dir) => engine(dir, 'old-sha'));
  assert.match(stale.log, /fetch --quiet --depth 1 https:\/\/github\.com\/mairie360\/CICD new-sha/);
  assert.equal(stale.ref, 'new-sha');
  // Same pin: reused.
  assert.equal(run((dir) => engine(dir, 'new-sha')).log, '');
  // No marker: the CI's own checkout is reused in GitHub Actions; locally it is fetched again.
  assert.equal(run((dir) => engine(dir, null), 'true').log, '');
  assert.equal(run((dir) => engine(dir, null)).ref, 'new-sha');
});

test('MAIR-316: the RGAA stack has its own project name and bounded readiness loops', () => {
  const compose = read('docker-compose-accessibility.yml');
  // The default project name (the folder) is shared with docker-compose.yml: `down -v` would
  // delete the dev stack's postgres-data / redis-data volumes.
  assert.match(compose, /^name: message-front-a11y$/m);
  // An upstream that never starts must fail `up`, not hang it.
  assert.doesNotMatch(compose, /sh -c 'until curl/);
  for (const [, loop] of compose.matchAll(/sh -c '(i=0; until curl[\s\S]*?)'\n/g)) {
    assert.match(loop, /if \[ \$\$i -ge \d+ \]; then echo "[^"]+"; exit 1; fi;/);
  }
});
