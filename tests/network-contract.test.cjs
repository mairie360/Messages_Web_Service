const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');
const ts = require('typescript');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { messageBffContract } = require('./support/fixtures.cjs');
const { appRoutes } = require('./support/front-network.cjs');
const { SRC, requireSrc } = require('./support/load-ts.cjs');

// Garde statique : tout le code de src/ est analysé (AST TypeScript) pour vérifier que les seuls appels
// réseau sont ceux testés contre le contrat de BFF Message (messageClient et déconnexion locale côté
// navigateur, forwardToBff côté serveur), que BFF Message est le seul BFF joint et que chaque chemin appelé
// par le navigateur est servi par une route relayant une opération déclarée ou par une route locale sans
// réseau. Les tests *.contract-mocks.test.cjs vérifient ensuite ces appels à l'exécution.

const sourceFiles = (dir = SRC) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return sourceFiles(full);
  return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [full] : [];
});
const relative = (file) => path.relative(SRC, file).split(path.sep).join('/');
const parse = (file) => ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2020, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const visit = (node, callback) => { callback(node); ts.forEachChild(node, (child) => visit(child, callback)); };

/** Fichiers autorisés à appeler `fetch`, et l'identifiant non littéral qu'ils peuvent lui passer. */
const FETCH_CALLERS = {
  'clients/messageClient.ts': { side: 'browser', dynamicArgument: 'path' },
  'lib/auth-session.ts': { side: 'browser' },
  'lib/bff-proxy.ts': { side: 'server', dynamicArgument: 'target' },
};
/** Fonctions navigateur dont le 1er argument est un chemin same-origin. */
const BROWSER_REQUESTERS = new Set(['fetch', 'bffRequest']);
const FORBIDDEN_MODULES = /^(axios|openapi-fetch|undici|got|ky|superagent|node-fetch|cross-fetch|(node:)?https?|(node:)?net|@mairie360\/bff-.*-openapi)$/;
const FORBIDDEN_CONSTRUCTORS = new Set(['XMLHttpRequest', 'WebSocket', 'EventSource']);

function scan(file) {
  const source = parse(file);
  const findings = { fetchCalls: [], browserRequests: [], forbidden: [] };
  visit(source, (node) => {
    if (ts.isImportDeclaration(node) && FORBIDDEN_MODULES.test(node.moduleSpecifier.text) && !node.importClause?.isTypeOnly) {
      findings.forbidden.push(`import ${node.moduleSpecifier.text}`);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && FORBIDDEN_MODULES.test(node.arguments[0].text)) {
      findings.forbidden.push(`require ${node.arguments[0].text}`);
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && FORBIDDEN_CONSTRUCTORS.has(node.expression.text)) {
      findings.forbidden.push(`new ${node.expression.text}`);
    }
    if (ts.isPropertyAccessExpression(node) && ['sendBeacon', 'fetch'].includes(node.name.text)) {
      findings.forbidden.push(`${node.expression.getText()}.${node.name.text}`);
    }
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    const callee = node.expression.text;
    if (callee === 'fetch') findings.fetchCalls.push(node.arguments[0]?.getText());
    if (!BROWSER_REQUESTERS.has(callee) || !node.arguments[0]) return;
    const [target, init] = node.arguments;
    const methodProperty = init && ts.isObjectLiteralExpression(init)
      ? init.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText() === 'method')
      : undefined;
    const method = methodProperty && ts.isStringLiteral(methodProperty.initializer) ? methodProperty.initializer.text : 'GET';
    if (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)) {
      findings.browserRequests.push({ callee, method, path: target.text });
    } else if (ts.isTemplateExpression(target)) {
      // Les segments interpolés deviennent des valeurs d'exemple, comme un identifiant réel.
      findings.browserRequests.push({ callee, method, path: target.head.text + target.templateSpans.map((span) => `sample${span.literal.text}`).join('') });
    } else {
      findings.browserRequests.push({ callee, method, dynamic: target.getText() });
    }
  });
  return findings;
}

const scans = Object.fromEntries(sourceFiles().map((file) => [relative(file), scan(file)]));
const messageContract = messageBffContract();

describe('front network calls are confined to the OpenAPI contracts', () => {
  test('no HTTP client, socket or beacon other than fetch is used in src/', () => {
    const forbidden = Object.entries(scans).flatMap(([file, { forbidden: found }]) => found.map((item) => `${file}: ${item}`));
    assert.deepEqual(forbidden, []);
  });

  test('fetch is only called by the contract-tested modules', () => {
    const callers = Object.entries(scans).filter(([, { fetchCalls }]) => fetchCalls.length > 0).map(([file]) => file);
    assert.deepEqual(callers.sort(), Object.keys(FETCH_CALLERS).sort());
    for (const [file, { dynamicArgument }] of Object.entries(FETCH_CALLERS)) {
      const dynamic = scans[file].browserRequests.filter((request) => request.dynamic).map((request) => request.dynamic);
      assert.deepEqual([...new Set(dynamic)], dynamicArgument ? [dynamicArgument] : [], file);
    }
  });

  test('browser requests target same-origin paths served by a route relaying a declared operation', () => {
    const routes = appRoutes();
    const resolve = (pathname) => {
      const parts = pathname.split('/').filter(Boolean);
      return routes.find(({ segments }) => (segments.at(-1)?.startsWith('[...')
        ? parts.length >= segments.length && segments.slice(0, -1).every((segment, i) => segment.startsWith('[') || segment === parts[i])
        : parts.length === segments.length && segments.every((segment, i) => segment.startsWith('[') || segment === parts[i])));
    };
    const requests = Object.entries(FETCH_CALLERS)
      .filter(([, { side }]) => side === 'browser')
      .flatMap(([file]) => scans[file].browserRequests.filter((request) => !request.dynamic).map((request) => ({ file, ...request })));
    assert.ok(requests.length >= 10, 'les appels du client et de la session sont détectés');

    for (const { file, method, path: pathname } of requests) {
      const label = `${file}: ${method} ${pathname}`;
      assert.match(pathname, /^\/(?!\/)/, `${label} doit être un chemin same-origin`);
      const route = resolve(pathname);
      assert.ok(route, `${label} sans route.ts`);
      if (route.route.startsWith('/api/')) {
        // Routes locales (déconnexion) : elles ne relaient rien, voir le test suivant.
        assert.equal(typeof requireSrc(path.relative(SRC, route.file))[method], 'function', label);
      } else {
        assert.ok(messageContract.match(method, pathname), `${label} absent du contrat BFF_Message`);
      }
    }
  });

  test('BFF Message is the only BFF: one base URL, relayed only by the contract routes', () => {
    const bffEnv = new Set();
    const relays = [];
    for (const file of sourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const [, name] of text.matchAll(/process\.env\.(\w*BFF\w*)/g)) bffEnv.add(`${relative(file)}: ${name}`);
      if (/\bforwardToBff\(/.test(text) && relative(file) !== 'lib/bff-proxy.ts') relays.push(relative(file));
    }
    assert.deepEqual([...bffEnv].sort(), [
      'lib/bff-proxy.ts: BFF_MESSAGE_BASE_URL', 'lib/bff-proxy.ts: MESSAGE_BFF_URL', 'lib/bff-proxy.ts: NEXT_PUBLIC_BFF_MESSAGE_BASE_URL',
    ]);
    assert.deepEqual(relays, ['app/business-references/route.ts']);
    assert.match(fs.readFileSync(path.join(SRC, 'app/business-references/route.ts'), 'utf8'), /forwardToBff\(request, configuredBffUrl\(\), '\/business-references'\)/);
    // Les routes /api/** sont locales : ni fetch, ni relais vers un BFF.
    for (const { file, route } of appRoutes().filter(({ route: name }) => name.startsWith('/api/'))) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /bff-proxy|fetch\(/, route);
    }
  });

  test('explicit data routes (outside /api) only expose operations declared by the BFF_Message contract', () => {
    for (const { file, route, segments } of appRoutes()) {
      if (route.startsWith('/api/') || segments.some((segment) => segment.startsWith('['))) continue;
      const handlers = requireSrc(path.relative(SRC, file));
      for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((name) => typeof handlers[name] === 'function')) {
        assert.ok(messageContract.document.paths[route]?.[method.toLowerCase()], `${method} ${route} (${relative(file)}) absent du contrat`);
      }
    }
  });

  test('the browser cannot reach another origin and Next.js does not rewrite to one', () => {
    const { buildContentSecurityPolicy } = requireSrc('lib/content-security-policy.ts');
    const directives = Object.fromEntries(buildContentSecurityPolicy('nonce').split('; ').map((directive) => {
      const [name, ...values] = directive.split(' ');
      return [name, values.join(' ')];
    }));
    assert.equal(directives['connect-src'], "'self'");
    assert.equal(directives['default-src'], "'self'");
    assert.equal(directives['form-action'], "'self'");
    const nextConfig = requireSrc('../next.config.ts').default;
    assert.deepEqual([nextConfig.rewrites, nextConfig.redirects], [undefined, undefined]);
  });

  test('every non-React module of src/ loads, so coverage reports all of them', () => {
    // node --experimental-test-coverage ne mesure que les fichiers chargés : un module jamais importé par un
    // test serait absent du rapport au lieu d'y apparaître à 0 %. Les composants .tsx (rendus par Next.js)
    // sont hors périmètre des tests sans DOM ; leur logique est extraite dans src/lib.
    const modules = sourceFiles().filter((file) => file.endsWith('.ts')).map(relative);
    for (const file of modules) assert.doesNotThrow(() => requireSrc(file), file);
    assert.ok(modules.includes('lib/messaging-state.ts'));
  });
});

describe('contract mocks detect drift (self-check of the test harness)', () => {
  test('BFF_Message mock reports undeclared routes, invalid bodies, undocumented statuses and unmocked calls', async () => {
    const mock = new ContractMockServer('BFF_MESSAGE', messageContract);
    await mock.start();
    try {
      assert.throws(() => mock.on('put', '/groups', {}), /n'est pas déclaré/);
      mock.on('post', '/groups', { status: 418, body: { conversation: { id: 1 } } });
      await fetch(`${mock.url}/groups?debug=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 12 }) });
      await fetch(`${mock.url}/unknown`);
      await fetch(`${mock.url}/contacts`);
      await fetch(`${mock.url}/attachments`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' });
      const expected = [
        /requête POST \/groups\?debug=1 : paramètre query "debug" non déclaré/,
        /\$body\.name: type string attendu/,
        /\$body\.memberIds: propriété requise manquante/,
        /statut 418 non documenté/,
        /GET \/unknown n'existe pas/,
        /appel non mocké : GET \/contacts/,
        /corps text\/plain non déclaré/,
      ];
      for (const pattern of expected) assert.ok(mock.violations.some((violation) => pattern.test(violation)), `${pattern} dans ${mock.violations.join('\n')}`);
    } finally {
      await mock.stop();
    }
  });
});
