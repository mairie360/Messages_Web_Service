# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "8c9f0a3dcbee14b456dea7ad0d884d94c0c32b8a", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "d950efef13cf04bf526892c50bc7efb61a5529a3", "updated": {"dev": "2026-10-19 21:58 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `d950efe` | — |
| dev | — | `8c9f0a3` | 2026-10-19 21:58 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Les actions confirmées affichent un message de succès refermable (`Toast`) : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. ». Il disparaît dès qu'une nouvelle action démarre ou que l'utilisateur change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Interface alignée sur le thème partagé de `@mairie360/lib-components`. Les couleurs passent par les variables du thème (`--mairie-background`, `--mairie-text`, `--mairie-accent`…). Le chargement des conversations affiche des `Skeleton`. La liste vide affiche « Aucune conversation » avec l'invitation « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe (`kind: 'direct'` avec son `contactId`) :
  - le message est publié dans cette conversation via `POST /conversations/{id}/messages`, et elle s'ouvre avec le message « Message envoyé dans la conversation existante. » ;
  - seul un contact sans conversation directe passe encore par `POST /direct-messages`, ce qui évite les fils en double avec le même contact ;
  - si l'envoi est refusé ou non confirmé, le brouillon est conservé (« Le message n’a pas pu être envoyé. ») et aucun autre fil n'est créé. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- La création d'un message direct ou d'un groupe n'est acceptée que si la réponse confirme les identifiants (et un nom non vide pour un groupe). Sinon, une erreur s'affiche et le brouillon est conservé : « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Dépendances :
  - le socle partagé (session, proxy, garde, thème) est importé depuis `@mairie360/lib-components@0.10.2` à la place de l'archive vendue `@mairie360/front-kit`, sans changement de comportement annoncé ;
  - le contrat passe à `@mairie360/bff-message-openapi` `1.0.0` ;
  - les stacks docker-compose de test utilisent les images de release (`bff-message:1.0.0`, `message-api:2.0.0`, `core-api:2.1.0`, `database`/`liquibase-migrations:3.2.0`). (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273) ; MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269))
- CI/CD : 2 changements.
  - Jeton du workflow en lecture seule par défaut, et `push` limité à `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - Passage à CICD v4.3.1 avec l'étape de journal de release. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271))
- Ajouts de tests : test du bundle client, et backport `braces` en dépendance de développement.

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Les actions confirmées affichent un message de succès refermable (`Toast`) : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. ». Il disparaît dès qu'une nouvelle action démarre ou que l'utilisateur change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Interface alignée sur le thème partagé de `@mairie360/lib-components`. Les couleurs passent par les variables du thème (`--mairie-background`, `--mairie-text`, `--mairie-accent`…). Le chargement des conversations affiche des `Skeleton`. La liste vide affiche « Aucune conversation » avec l'invitation « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe (`kind: 'direct'` avec son `contactId`) :
  - le message est publié dans cette conversation via `POST /conversations/{id}/messages`, et elle s'ouvre avec le message « Message envoyé dans la conversation existante. » ;
  - seul un contact sans conversation directe passe encore par `POST /direct-messages`, ce qui évite les fils en double avec le même contact ;
  - si l'envoi est refusé ou non confirmé, le brouillon est conservé (« Le message n’a pas pu être envoyé. ») et aucun autre fil n'est créé. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- La création d'un message direct ou d'un groupe n'est acceptée que si la réponse confirme les identifiants (et un nom non vide pour un groupe). Sinon, une erreur s'affiche et le brouillon est conservé : « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Dépendances :
  - le socle partagé (session, proxy, garde, thème) est importé depuis `@mairie360/lib-components@0.10.2` à la place de l'archive vendue `@mairie360/front-kit`, sans changement de comportement annoncé ;
  - le contrat passe à `@mairie360/bff-message-openapi` `1.0.0` ;
  - les stacks docker-compose de test utilisent les images de release (`bff-message:1.0.0`, `message-api:2.0.0`, `core-api:2.1.0`, `database`/`liquibase-migrations:3.2.0`). (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273) ; MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269))
- CI/CD : 2 changements.
  - Jeton du workflow en lecture seule par défaut, et `push` limité à `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - Passage à CICD v4.3.1 avec l'étape de journal de release. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271))
- Ajouts de tests : test du bundle client, et backport `braces` en dépendance de développement.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
