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

## Initial loading recovery / Reprise du chargement initial (MAIR-457, #207)

Initial loading and refusal are separate from a confirmed empty conversation list.
Messaging write controls appear only after the existing bootstrap completes. An
explicit Retry repeats that read without reloading, prevents overlapping commands,
and retains the existing deep-link and contact-fallback behavior. Disposed or older
responses are ignored logically: the unchanged client does not support transport
cancellation. No acknowledgement or write is performed by recovery.

L’attente et le refus initial ne sont pas présentés comme une liste vide confirmée.
Réessayer relance la lecture existante sans recharger la page ni envoyer d’écriture.
La commande indique l’attente et bloque les doublons ; les liens directs et le
repli des contacts restent conservés. Les réponses anciennes/après démontage sont
ignorées, sans prétendre annuler le transport. Tests et fixtures restent isolés ;
ils ne prouvent ni authentification ni persistance déployées. API/BFF, contrats,
clients, bibliothèque partagée et déploiements ne changent pas.

## Contracts and background / Contrats et compléments

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.
