# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "9856e2c32b064a9ad5418e67cc1e32f29fded4e9", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "d950efef13cf04bf526892c50bc7efb61a5529a3", "updated": {"dev": "2026-10-20 13:42 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `d950efe` | — |
| dev | — | `9856e2c` | 2026-10-20 13:42 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Après une création de message direct, une création de groupe ou une suppression de conversation confirmée, un toast de succès refermable s'affiche : « Message direct créé. », « Groupe « … » créé. » ou « Conversation « … » supprimée. ». Il disparaît dès qu'une autre action commence ou que l'utilisateur connecté change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Le chargement des conversations affiche un squelette (`Skeleton`). Sans conversation sélectionnée, la page affiche l'état vide « Aucune conversation » avec « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- Le module Messages applique le thème partagé de `@mairie360/lib-components` : feuille `@mairie360/lib-components/styles.css` et variables `--mairie-*` pour le fond, le texte, les erreurs et le focus. Ces variables remplacent les couleurs codées en dur, et `municipal-theme.css` est supprimé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe n'est plus prise pour acquise : si la réponse du BFF ne confirme pas les identifiants (ou le nom du groupe), l'interface affiche « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact ouvrait avant un nouveau fil à chaque fois via `POST /direct-messages`, et les conversations avec un même contact s'accumulaient. Désormais, si une conversation directe existe déjà avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages` et cette conversation s'ouvre, avec le message « Message envoyé dans la conversation existante. ». Seul un contact sans conversation directe passe par `POST /direct-messages`. Un envoi refusé ou non confirmé conserve le brouillon et ne crée jamais d'autre fil (« Le message n’a pas pu être envoyé. » ou « L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation. »). (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances, sans changement de comportement annoncé :
  - `@mairie360/lib-components` passe de 0.8.0 à 0.10.2, et ses sous-chemins remplacent l'archive vendorisée `@mairie360/front-kit`. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
  - Le contrat `@mairie360/bff-message-openapi` passe à 1.0.0, puis à `0.0.0-dev.9cb0aa6787d556b57b2e858ee6f9bdbe355d42e3`. (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269) ; MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279))
  - Les images des stacks de test `docker-compose*.yml` sont alignées (`bff-message:dev-9cb0aa6`, `core-api:2.1.0`, `database:3.2.0`, `liquibase-migrations:3.2.0`, `message-api:2.0.0`). Un backport `braces` de développement est ajouté. (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269) ; MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279) ; [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- CI et tests, en 4 PR :
  - Jeton du workflow en lecture seule par défaut et `push` limité à `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - CICD épinglé en v4.3.1 puis v4.3.2, avec les secrets du journal des releases et un suivi Renovate du SHA et du tag. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275))
  - Nouveau contrôle `npm run test:bundle` du bundle client, affiné pour lire les imports depuis l'AST TypeScript. (MAIR-126, [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Après une création de message direct, une création de groupe ou une suppression de conversation confirmée, un toast de succès refermable s'affiche : « Message direct créé. », « Groupe « … » créé. » ou « Conversation « … » supprimée. ». Il disparaît dès qu'une autre action commence ou que l'utilisateur connecté change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Le chargement des conversations affiche un squelette (`Skeleton`). Sans conversation sélectionnée, la page affiche l'état vide « Aucune conversation » avec « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- Le module Messages applique le thème partagé de `@mairie360/lib-components` : feuille `@mairie360/lib-components/styles.css` et variables `--mairie-*` pour le fond, le texte, les erreurs et le focus. Ces variables remplacent les couleurs codées en dur, et `municipal-theme.css` est supprimé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe n'est plus prise pour acquise : si la réponse du BFF ne confirme pas les identifiants (ou le nom du groupe), l'interface affiche « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact ouvrait avant un nouveau fil à chaque fois via `POST /direct-messages`, et les conversations avec un même contact s'accumulaient. Désormais, si une conversation directe existe déjà avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages` et cette conversation s'ouvre, avec le message « Message envoyé dans la conversation existante. ». Seul un contact sans conversation directe passe par `POST /direct-messages`. Un envoi refusé ou non confirmé conserve le brouillon et ne crée jamais d'autre fil (« Le message n’a pas pu être envoyé. » ou « L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation. »). (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances, sans changement de comportement annoncé :
  - `@mairie360/lib-components` passe de 0.8.0 à 0.10.2, et ses sous-chemins remplacent l'archive vendorisée `@mairie360/front-kit`. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
  - Le contrat `@mairie360/bff-message-openapi` passe à 1.0.0, puis à `0.0.0-dev.9cb0aa6787d556b57b2e858ee6f9bdbe355d42e3`. (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269) ; MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279))
  - Les images des stacks de test `docker-compose*.yml` sont alignées (`bff-message:dev-9cb0aa6`, `core-api:2.1.0`, `database:3.2.0`, `liquibase-migrations:3.2.0`, `message-api:2.0.0`). Un backport `braces` de développement est ajouté. (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269) ; MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279) ; [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- CI et tests, en 4 PR :
  - Jeton du workflow en lecture seule par défaut et `push` limité à `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - CICD épinglé en v4.3.1 puis v4.3.2, avec les secrets du journal des releases et un suivi Renovate du SHA et du tag. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275))
  - Nouveau contrôle `npm run test:bundle` du bundle client, affiné pour lire les imports depuis l'AST TypeScript. (MAIR-126, [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 13:42 UTC | dev | — | `9856e2c` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39431943853) |
| 2026-10-20 12:23 UTC | dev | — | `fcb38f1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39421323652) |
| 2026-10-19 22:13 UTC | dev | — | `65902bb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39332830353) |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
