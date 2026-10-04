# Messages_Web_Service

Provide the instant-messaging interface with conversations, contacts and links to business objects. Calls go through BFF Message.

Fournir l’interface de messagerie instantanée avec conversations, contacts et liens vers les objets métier. Les appels passent par BFF Message.

## Documentation

| Language / Langue | Module | Technical / Technique |
| --- | --- | --- |
| English | [Module overview](docs/en/module.md) | [Technical documentation](docs/en/technical.md) |
| Français | [Présentation du module](docs/fr/module.md) | [Documentation technique](docs/fr/technical.md) |

The guides describe the implemented module, its current limitations, local setup, routes, data, verification and CI/CD.

Les guides décrivent le module implémenté, ses limites actuelles, le démarrage local, les routes, les données, les vérifications et la CI/CD.

## Contracts and background / Contrats et compléments

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.

## Reference reception cadence (MAIR-212)

Conversation lists and the active thread refresh every two seconds while the
page is visible, matching the preserved local prototype. Focus and visibility
changes also trigger a refresh. A pending read or mutation skips the cycle;
there is no queue of concurrent requests. Cleanup removes the timer/listeners.
Failed reads keep known messages, and revision guards reject stale replies.

Only published conversation/message reads are used. Server unread counts stay
authoritative: this does not enable or simulate persistent read acknowledgement,
which remains blocked under MAIR-269. The fallback-thread complement PR #210 is
independent. No API/BFF, client, proxy, contract, dependency or environment change.

Tracking: [MAIR-212](https://mairie-360.atlassian.net/browse/MAIR-212) and
[Messages #144](https://github.com/mairie360/Messages_Web_Service/issues/144).
Cadence, slow-read deduplication, unsent draft preservation, hidden-tab polling
and teardown are covered by real-page HTTP-contract-backed regressions.
Integration and exact-head CI remain required before declaring delivery.
