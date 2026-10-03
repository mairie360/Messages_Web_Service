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
# Messaging dialog keyboard focus (MAIR-318)

The Messages consumer supplies focus lifecycle for the published New message and
Create group dialogs: initial focus, Tab/Shift+Tab containment, Escape through
the existing enabled Close button, and return to the opener. Disabled, hidden,
inert and unrendered controls are excluded. Observers/listeners are cleaned up.
No library override, BFF/API, contract, client, proxy or authentication change is
required. The pending Close guard remains owned by the published component.

Tracking: [MAIR-318](https://mairie-360.atlassian.net/browse/MAIR-318),
[Messages #212](https://github.com/mairie360/Messages_Web_Service/issues/212).
The issue must remain open until exact-head CI, integration and a refreshed
local-main verification are complete. This is not global RGAA certification.

Validation: ten controller tests with DOM doubles, plus native production-build
QA at 1280x720 and 390x844 with the published UI 0.6.8. Both dialogs, contact
filtering/selection, draft editing, button validation, focus loops and Escape
return were exercised. The temporary HTTP fixture made GET requests only; real
POST pending/refusal/confirmation is not claimed. Unit tests cover the disabled
Close guard. Production configuration, dependencies and demo data are unchanged.

Separate known gap: the composer draft can follow the user from conversation A
to B. That recipient-isolation issue is not resolved by this focus change.
