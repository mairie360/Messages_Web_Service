# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "d74d7fa610ec6a9126bd3f5e8ed7750fe960b069", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "d950efef13cf04bf526892c50bc7efb61a5529a3", "updated": {"dev": "2026-10-19 20:07 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `d950efe` | — |
| dev | — | `d74d7fa` | 2026-10-19 20:07 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Les actions confirmées affichent un message de succès refermable (`Toast`) : « Message direct créé. », « Groupe « <nom> » créé. », « Conversation « <nom> » supprimée. ». Le message disparaît dès qu'une nouvelle action commence ou que l'utilisateur connecté change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Pendant le chargement des conversations, un espace réservé de chargement (`Skeleton`) s'affiche. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Sans conversation sélectionnée, l'interface affiche un état vide « Aucune conversation » avec l'indication « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- L'interface adopte le thème commun de `@mairie360/lib-components` 0.9.0 : feuille de style partagée et couleurs issues des variables `--mairie-*`, à la place du thème municipal local, qui est supprimé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe n'est plus considérée comme réussie si la réponse du BFF est incomplète, et le brouillon est conservé :
  - pour un message direct, il faut des identifiants de conversation et de message, et le message doit appartenir à la conversation ; sinon « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ;
  - pour un groupe, il faut un identifiant et un nom non vide ; sinon « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ».
  ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact ne crée plus un nouveau fil à chaque envoi.
  - Avant : il appelait toujours `POST /direct-messages`, et les conversations avec un même contact s'accumulaient.
  - Maintenant : s'il existe déjà une conversation directe avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages`, cette conversation s'ouvre et l'interface affiche « Message envoyé dans la conversation existante. ». Seul un contact sans conversation directe passe par `POST /direct-messages`.
  - En cas d'échec : un envoi refusé ou non confirmé conserve le brouillon, ne crée jamais un autre fil et affiche « Le message n’a pas pu être envoyé. » ou « L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation. ».
  (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- CI : passage au pipeline `mairie360/CICD` v4.3.1, qui ajoute l'étape de journal de release. Le jeton du workflow est désormais en lecture seule par défaut et les déclenchements sur `push` sont limités à `main`. Documentation alignée sur Node 24.21.0. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271) ; MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
- Dépendances :
  - contrat `@mairie360/bff-message-openapi` passé de `0.0.0-dev` à 1.0.0 ;
  - images des stacks `docker-compose*.yml` passées sur les versions prod (`bff-message` 1.0.0, `core-api` 2.1.0, `database` et `liquibase-migrations` 3.2.0, `message-api` 2.0.0) ;
  - correctif de `braces` embarqué localement, en développement uniquement.
  (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269) ; [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Les actions confirmées affichent un message de succès refermable (`Toast`) : « Message direct créé. », « Groupe « <nom> » créé. », « Conversation « <nom> » supprimée. ». Le message disparaît dès qu'une nouvelle action commence ou que l'utilisateur connecté change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Pendant le chargement des conversations, un espace réservé de chargement (`Skeleton`) s'affiche. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Sans conversation sélectionnée, l'interface affiche un état vide « Aucune conversation » avec l'indication « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- L'interface adopte le thème commun de `@mairie360/lib-components` 0.9.0 : feuille de style partagée et couleurs issues des variables `--mairie-*`, à la place du thème municipal local, qui est supprimé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe n'est plus considérée comme réussie si la réponse du BFF est incomplète, et le brouillon est conservé :
  - pour un message direct, il faut des identifiants de conversation et de message, et le message doit appartenir à la conversation ; sinon « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ;
  - pour un groupe, il faut un identifiant et un nom non vide ; sinon « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ».
  ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact ne crée plus un nouveau fil à chaque envoi.
  - Avant : il appelait toujours `POST /direct-messages`, et les conversations avec un même contact s'accumulaient.
  - Maintenant : s'il existe déjà une conversation directe avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages`, cette conversation s'ouvre et l'interface affiche « Message envoyé dans la conversation existante. ». Seul un contact sans conversation directe passe par `POST /direct-messages`.
  - En cas d'échec : un envoi refusé ou non confirmé conserve le brouillon, ne crée jamais un autre fil et affiche « Le message n’a pas pu être envoyé. » ou « L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation. ».
  (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- CI : passage au pipeline `mairie360/CICD` v4.3.1, qui ajoute l'étape de journal de release. Le jeton du workflow est désormais en lecture seule par défaut et les déclenchements sur `push` sont limités à `main`. Documentation alignée sur Node 24.21.0. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271) ; MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
- Dépendances :
  - contrat `@mairie360/bff-message-openapi` passé de `0.0.0-dev` à 1.0.0 ;
  - images des stacks `docker-compose*.yml` passées sur les versions prod (`bff-message` 1.0.0, `core-api` 2.1.0, `database` et `liquibase-migrations` 3.2.0, `message-api` 2.0.0) ;
  - correctif de `braces` embarqué localement, en développement uniquement.
  (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269) ; [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
