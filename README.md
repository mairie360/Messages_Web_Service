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

## Shared UI alignment / Alignement UI partagé — MAIR-180

This consumer pins the published `@mairie360/lib-components@0.6.10`, including
its exact download URL and SHA512 integrity. Only the shared UI entry changes
in the lockfile; all other dependencies and security policies are preserved.
Tracking: [MAIR-180](https://mairie-360.atlassian.net/browse/MAIR-180) and
[cross-frontend issue](https://github.com/mairie360/Login_Web_Service/issues/142).
Login stays standalone without header/sidebar/footer; authenticated module
shells and the existing Elearning confirmation/rating features are preserved.
No API/BFF, contract, runtime configuration, demo data or deployment approval change.

Le pin exact et l'intégrité du package publié sont alignés sur Elearning sans
le rétrograder. Les tests de release vérifient le manifeste, le lockfile et le
vrai package installé. Une validation isolée ne remplace pas la CI verte,
l'intégration des sept consommateurs et la recette de la copie locale livrée.
