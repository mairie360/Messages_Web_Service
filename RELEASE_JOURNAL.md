# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "233703a2d9dbfbfda2b499c4581ea5d75ae78c64", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "updated": {"dev": "2026-10-21 10:55 UTC", "staging": "2026-10-20 19:02 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `500ac41` | 2026-10-20 19:02 UTC |
| dev | — | `233703a` | 2026-10-21 10:55 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Conversation directe : après l'envoi d'un message dans une conversation existante, un bandeau de confirmation « Message envoyé dans la conversation existante. » s'affiche ; la création d'un groupe affiche « Groupe « nom » créé. » et la suppression d'une conversation affiche « Conversation « nom » supprimée. ». Ces confirmations sont fermables. (MAIR-126 / thème partagé, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Messagerie vide : l'état « Aucune conversation » affiche désormais un titre et la description « Créez un message ou un groupe pour commencer. », et un squelette de chargement apparaît pendant la lecture des conversations. (MAIR-126 / thème partagé, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe publie désormais le message dans cette conversation (`POST /conversations/{id}/messages`) et l'ouvre ; seul un contact sans conversation directe crée un nouveau fil via `POST /direct-messages`. Un envoi refusé conserve le brouillon et ne crée jamais un autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Le thème visuel vient désormais de la feuille de style publiée de `@mairie360/lib-components` (variables `--mairie-*`) : le fichier `municipal-theme.css` local est supprimé et les couleurs de l'application changent en conséquence. (MAIR-126 / thème partagé, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- Création d'un message direct ou d'un groupe : avant, une réponse sans identifiant de conversation ou de message était acceptée ; maintenant, l'application affiche une erreur (« La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ») et le brouillon reste en place. (MAIR-204 et thème partagé, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140), [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Dépendances : `@mairie360/lib-components` passe de 0.8.0 à 0.10.2 ; le front-kit vendu est remplacé par des sous-chemins de la lib, et un test de bundle client (`npm run test:bundle`) est ajouté au workflow de performance. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267), [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
- Contrat BFF : `@mairie360/bff-message-openapi` passe en 1.0.0 puis en paquet `0.0.0-staging.<sha40>` ; les stacks de test passent aux images `bff-message`, `core-api`, `database`, `liquibase-migrations` et `message-api` en versions de release ou staging. Le diff de `contracts/openapi.json` ne modifie que `x-source-package`. (MAIR-569, MAIR-575, MAIR-600, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#279](https://github.com/mairie360/Messages_Web_Service/pull/279), [#281](https://github.com/mairie360/Messages_Web_Service/pull/281))
- CI et releases : `mairie360/CICD` passe en v4.3.1, v4.3.2, v4.4.0 puis v4.4.3 ; les workflows `promote-staging.yml` et `promote-prod.yml` sont ajoutés (promotion manuelle, un seul déploiement à la fois par cible), `cicd.yml` ne s'exécute sur push que pour main, le jeton est en lecture seule par défaut et les secrets du journal de release sont transmis. (MAIR-436, MAIR-494, MAIR-571, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#287](https://github.com/mairie360/Messages_Web_Service/pull/287))
- Dépendances : `follow-redirects` 1.16.1 dans le lockfile, et `braces` passe en dépendance de développement via `vendor/braces`. Les images `database` et `liquibase-migrations` passent en 3.2.0 puis 3.3.0 dans les stacks de test ; le contenu du schéma 3.3.0 n'apparaît pas dans le diff. ([#294](https://github.com/mairie360/Messages_Web_Service/pull/294), [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#287](https://github.com/mairie360/Messages_Web_Service/pull/287))
- Tests : nouveaux tests de politique de pin CICD (`tests/cicd-pin.test.cjs`), de permissions de workflow et de contrat de version ; mise à jour de tests de rendu de la messagerie. ([#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#281](https://github.com/mairie360/Messages_Web_Service/pull/281))

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Renovate : `core-api` passe en 2.2.0 dans les stacks de test, et les images `database` et `liquibase-migrations` passent en 3.3.0 ; le contenu du schéma 3.3.0 n'apparaît pas dans le diff. (Renovate, [#292](https://github.com/mairie360/Messages_Web_Service/pull/292), [#294](https://github.com/mairie360/Messages_Web_Service/pull/294))
- Processus de release : `mairie360/CICD` passe en v4.4.3 ; un push sur main ne va plus au-delà de release-dev, et staging ainsi que prod se déclenchent à la main via `promote-staging.yml` et `promote-prod.yml` (MAIR-494). `follow-redirects` passe en 1.16.1 dans le lockfile. ([#284](https://github.com/mairie360/Messages_Web_Service/pull/284), [#287](https://github.com/mairie360/Messages_Web_Service/pull/287))

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Messagerie vide : l'état « Aucune conversation » affiche un titre et la description « Créez un message ou un groupe pour commencer. », et un squelette de chargement apparaît pendant la lecture des conversations. (MAIR-126 / thème partagé, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Confirmations fermables après « Nouveau message » direct, création de groupe et suppression de conversation (« Message direct créé. », « Groupe « nom » créé. », « Conversation « nom » supprimée. »). (MAIR-126 / thème partagé, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe publie dans cette conversation (`POST /conversations/{id}/messages`) au lieu de créer un nouveau fil via `POST /direct-messages` ; un envoi refusé garde le brouillon sans créer d'autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Le thème visuel vient de la feuille de style publiée de `@mairie360/lib-components` ; `municipal-theme.css` est supprimé et les couleurs changent. (MAIR-126 / thème partagé, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- Création d'un message direct ou d'un groupe : avant, une réponse sans identifiant de conversation ou de message était acceptée ; maintenant, une erreur est affichée et le brouillon est conservé. (MAIR-204 et thème partagé, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140), [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Dépendances : `@mairie360/lib-components` passe de 0.8.0 à 0.10.2, le front-kit vendu est remplacé par des sous-chemins de la lib, et un test de bundle client est ajouté. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267), [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
- Contrat BFF et stacks de test : versions de release ou staging pour les paquets et images ; `contracts/openapi.json` ne change que `x-source-package`. (MAIR-569, MAIR-575, MAIR-600, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#279](https://github.com/mairie360/Messages_Web_Service/pull/279), [#281](https://github.com/mairie360/Messages_Web_Service/pull/281))
- CI : `mairie360/CICD` passe en v4.3.1 à v4.4.3 ; permissions réduites, triggers sur main, journal de release et tests de pin ajoutés. (MAIR-436, MAIR-571, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275))
- Tests : `tests/bundle/client-bundle.test.cjs` et ajustements des tests de contrat et de rendu. ([#277](https://github.com/mairie360/Messages_Web_Service/pull/277), [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 10:55 UTC | dev | — | `233703a` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39585022648) |
| 2026-10-21 10:54 UTC | dev | — | `58f03ae` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39585004493) |
| 2026-10-21 10:50 UTC | dev | — | `7e2e0be` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39584885863) |
| 2026-10-21 01:41 UTC | dev | — | `7f2b8a1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39528137691) |
| 2026-10-20 19:02 UTC | staging | — | `500ac41` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39478543240) |
| 2026-10-20 18:57 UTC | dev | — | `500ac41` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39478543240) |
| 2026-10-20 13:42 UTC | dev | — | `9856e2c` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39431943853) |
| 2026-10-20 12:23 UTC | dev | — | `fcb38f1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39421323652) |
| 2026-10-19 22:13 UTC | dev | — | `65902bb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39332830353) |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
