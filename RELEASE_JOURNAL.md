# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "fcb38f11c11c7bfa8f93b27f8eba4e8335700d49", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "d950efef13cf04bf526892c50bc7efb61a5529a3", "updated": {"dev": "2026-10-20 12:23 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `d950efe` | — |
| dev | — | `fcb38f1` | 2026-10-20 12:23 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Après une action confirmée, un message de succès s'affiche dans un toast que l'agent peut fermer : « Message direct créé. », « Groupe « … » créé. » ou « Conversation « … » supprimée. ». Ce message disparaît dès qu'une nouvelle action démarre ou que le compte change. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Pendant le chargement des conversations, un espace réservé animé (`Skeleton`) s'affiche. Une liste vide montre un état vide intitulé « Aucune conversation », avec le texte « Créez un message ou un groupe pour commencer. ». (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- La messagerie adopte le thème partagé de `@mairie360/lib-components` (0.9.0, puis 0.10.2) : feuille de style commune et couleurs issues des variables `--mairie-*` (fond, texte, accent, erreurs). La feuille `municipal-theme.css` propre au module est supprimée. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe n'est plus tenue pour réussie sans confirmation complète du BFF. Pour un message direct, il faut les identifiants de la conversation et du message, et qu'ils concordent. Pour un groupe, il faut un identifiant et un nom non vide. Sinon le brouillon est conservé et l'erreur « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. » s'affiche. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact :
  - Avant : chaque envoi appelait `POST /direct-messages` et ouvrait un nouveau fil, si bien que les conversations avec un même contact s'accumulaient.
  - Maintenant : si une conversation directe existe déjà avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages`, la conversation s'ouvre et le message « Message envoyé dans la conversation existante. » s'affiche. Seul un contact sans conversation directe passe par `POST /direct-messages`.
  - Un envoi refusé ou non confirmé conserve le brouillon et ne crée jamais d'autre fil (« Le message n’a pas pu être envoyé. »).
  (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances :
  - Le contrat `@mairie360/bff-message-openapi` passe du build `0.0.0-dev` à la release `1.0.0` ([#269](https://github.com/mairie360/Messages_Web_Service/pull/269)).
  - Les images des stacks docker-compose de test passent sur des versions de release : `bff-message` 1.0.0, `core-api` 2.1.0, `database`/`liquibase-migrations` 3.2.0, `message-api` 2.0.0 ([#269](https://github.com/mairie360/Messages_Web_Service/pull/269)).
  - Le socle partagé est désormais importé depuis les sous-chemins de `@mairie360/lib-components` 0.10.2. L'archive vendorisée `@mairie360/front-kit` est retirée, sans changement de comportement annoncé ([#273](https://github.com/mairie360/Messages_Web_Service/pull/273)).
  - Nouveau contrôle `npm run test:bundle` du bundle client ([#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277)).
  (MAIR-569, MAIR-126)
- CI, sur 3 PR : jeton du workflow en lecture seule par défaut et `push` limité à `main`, workflow réutilisable `mairie360/CICD` passé en v4.3.1 puis v4.3.2 avec le journal des releases et ses secrets, épinglage suivi par Renovate. (MAIR-436, MAIR-571, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Après une action confirmée, un message de succès s'affiche dans un toast que l'agent peut fermer : « Message direct créé. », « Groupe « … » créé. » ou « Conversation « … » supprimée. ». Ce message disparaît dès qu'une nouvelle action démarre ou que le compte change. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Pendant le chargement des conversations, un espace réservé animé (`Skeleton`) s'affiche. Une liste vide montre un état vide intitulé « Aucune conversation », avec le texte « Créez un message ou un groupe pour commencer. ». (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- La messagerie adopte le thème partagé de `@mairie360/lib-components` (0.9.0, puis 0.10.2) : feuille de style commune et couleurs issues des variables `--mairie-*` (fond, texte, accent, erreurs). La feuille `municipal-theme.css` propre au module est supprimée. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe n'est plus tenue pour réussie sans confirmation complète du BFF. Pour un message direct, il faut les identifiants de la conversation et du message, et qu'ils concordent. Pour un groupe, il faut un identifiant et un nom non vide. Sinon le brouillon est conservé et l'erreur « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. » s'affiche. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact :
  - Avant : chaque envoi appelait `POST /direct-messages` et ouvrait un nouveau fil, si bien que les conversations avec un même contact s'accumulaient.
  - Maintenant : si une conversation directe existe déjà avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages`, la conversation s'ouvre et le message « Message envoyé dans la conversation existante. » s'affiche. Seul un contact sans conversation directe passe par `POST /direct-messages`.
  - Un envoi refusé ou non confirmé conserve le brouillon et ne crée jamais d'autre fil (« Le message n’a pas pu être envoyé. »).
  (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances :
  - Le contrat `@mairie360/bff-message-openapi` passe du build `0.0.0-dev` à la release `1.0.0` ([#269](https://github.com/mairie360/Messages_Web_Service/pull/269)).
  - Les images des stacks docker-compose de test passent sur des versions de release : `bff-message` 1.0.0, `core-api` 2.1.0, `database`/`liquibase-migrations` 3.2.0, `message-api` 2.0.0 ([#269](https://github.com/mairie360/Messages_Web_Service/pull/269)).
  - Le socle partagé est désormais importé depuis les sous-chemins de `@mairie360/lib-components` 0.10.2. L'archive vendorisée `@mairie360/front-kit` est retirée, sans changement de comportement annoncé ([#273](https://github.com/mairie360/Messages_Web_Service/pull/273)).
  - Nouveau contrôle `npm run test:bundle` du bundle client ([#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277)).
  (MAIR-569, MAIR-126)
- CI, sur 3 PR : jeton du workflow en lecture seule par défaut et `push` limité à `main`, workflow réutilisable `mairie360/CICD` passé en v4.3.1 puis v4.3.2 avec le journal des releases et ses secrets, épinglage suivi par Renovate. (MAIR-436, MAIR-571, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 12:23 UTC | dev | — | `fcb38f1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39421323652) |
| 2026-10-19 22:13 UTC | dev | — | `65902bb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39332830353) |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
