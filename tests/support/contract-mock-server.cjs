const http = require('node:http');

// Faux service amont servi en HTTP réel, porté depuis BFFs/*/tests/support/contract-mock-server.ts :
// chaque requête reçue est vérifiée contre le contrat OpenAPI du service simulé (chemin, méthode,
// paramètres, corps JSON) et chaque réponse mockée est validée contre le schéma du statut renvoyé.
// Les écarts sont collectés dans `violations`, que chaque test doit laisser vide.

class ContractMockServer {
  constructor(service, contract) {
    this.service = service;
    this.contract = contract;
    this.requests = [];
    this.violations = [];
    this.handlers = new Map();
    this.server = undefined;
    this.url = '';
  }

  async start() {
    this.server = http.createServer((req, res) => {
      this.handle(req, res).catch((error) => {
        // Une exception dans le mock ne doit pas tuer node:test : elle devient une violation.
        this.violations.push(`[${this.service}] erreur du mock : ${error instanceof Error ? error.message : String(error)}`);
        send(res, 500, JSON.stringify({ error: { message: 'Erreur du mock' } }));
      });
    });
    await new Promise((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${this.server.address().port}`;
    return this.url;
  }

  async stop() {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise((resolve) => this.server.close(() => resolve()));
    this.server = undefined;
  }

  /** Enregistre un handler ; le couple méthode/chemin doit exister dans le contrat amont. */
  on(method, template, handler) {
    if (!this.contract.document.paths[template]?.[method.toLowerCase()]) {
      throw new Error(`${method} ${template} n'est pas déclaré dans le contrat ${this.contract.title}`);
    }
    this.handlers.set(`${method.toUpperCase()} ${template}`, typeof handler === 'function' ? handler : () => handler);
    return this;
  }

  reset() {
    this.requests.length = 0;
    this.violations.length = 0;
    this.handlers.clear();
  }

  calls(template, method) {
    return this.requests.filter((request) => request.template === template && (!method || request.method === method.toUpperCase()));
  }

  async handle(req, res) {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', this.url);
    const rawBody = await readBody(req);
    const { match, errors } = this.contract.validateRequest(method, url);
    errors.forEach((error) => this.violations.push(`[${this.service}] requête ${method} ${url.pathname}${url.search} : ${error}`));
    if (!match) return send(res, 404, JSON.stringify({ error: { message: 'Route absente du contrat' } }));

    let body;
    const { required, contentTypes, schema: bodySchema } = this.contract.requestBodySchema(match);
    const contentType = (req.headers['content-type'] ?? '').split(';')[0].trim();
    if (rawBody.length > 0) {
      if (!contentTypes.includes(contentType)) {
        this.violations.push(`[${this.service}] requête ${method} ${match.template} : corps ${contentType || 'sans Content-Type'} non déclaré (${contentTypes.join(', ') || 'aucun corps'})`);
      } else if (contentType === 'application/json') {
        try { body = JSON.parse(rawBody.toString('utf8')); } catch { this.violations.push(`[${this.service}] requête ${method} ${match.template} : corps JSON invalide`); }
      }
    } else if (required) {
      this.violations.push(`[${this.service}] requête ${method} ${match.template} : corps requis manquant`);
    }
    if (bodySchema && body !== undefined) {
      this.contract.validate(bodySchema, body, '$body').forEach((error) => this.violations.push(`[${this.service}] requête ${method} ${match.template} ${error}`));
    }

    const request = { method, url, template: match.template, pathParams: match.pathParams, headers: req.headers, body, rawBody };
    this.requests.push(request);
    const handler = this.handlers.get(`${method} ${match.template}`);
    if (!handler) {
      this.violations.push(`[${this.service}] appel non mocké : ${method} ${match.template}`);
      return send(res, 500, JSON.stringify({ error: { message: 'Appel non mocké' } }));
    }

    const reply = await handler(request);
    if (reply.dropConnection) return void req.socket.destroy();
    const status = reply.status ?? 200;
    if (!reply.outOfContract) {
      const { documented, schema } = this.contract.responseSchema(match, status);
      if (!documented) this.violations.push(`[${this.service}] ${method} ${match.template} : statut ${status} non documenté`);
      if (schema && reply.raw === undefined) {
        this.contract.validate(schema, reply.body).forEach((error) => this.violations.push(`[${this.service}] réponse ${status} ${method} ${match.template} ${error}`));
      }
    }
    return send(res, status, reply.raw ?? (reply.body === undefined ? '' : JSON.stringify(reply.body)), reply.contentType, reply.headers);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, payload, contentType = 'application/json', headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, { ...(payload ? { 'Content-Type': contentType } : {}), ...headers });
  res.end(payload);
}

module.exports = { ContractMockServer };
