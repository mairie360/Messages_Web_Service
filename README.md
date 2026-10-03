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

## Conversation fallback recovery

A confirmed deletion of the selected conversation immediately reads the remaining
selected thread through the existing message operation. Visible synchronization
also reads the replacement thread in the same cycle when the active conversation
disappears, or when a first conversation arrives in a previously empty list.
It does not wait for another ten-second interval to make that thread usable.

A refused replacement read retains any previously confirmed messages in the
remaining thread, reports the failure and permits recovery by selecting that
conversation again. A confirmed disappearance is not undone by a read refusal.
Responses for another ID, an earlier selection, or a read started before a
confirmed send/deletion cannot replace newer state. Unread counts remain those
supplied by the service; this recovery never acknowledges messages as read.

The page tests cover these paths using isolated HTTP fixtures and the published
DTOs. The known operation/model mismatch for thread responses is explicitly
recorded by the existing test harness, not hidden as deployed-service validation.
Persistent read acknowledgement remains outside this frontend correction and
blocked under MAIR-269; MAIR-212 / issue #144 must remain open for that acceptance.
