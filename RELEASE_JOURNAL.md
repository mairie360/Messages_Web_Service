# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "7f2b8a1d72959931543390298430d93045843206", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "updated": {"dev": "2026-10-21 01:41 UTC", "staging": "2026-10-20 19:02 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `500ac41` | 2026-10-20 19:02 UTC |
| dev | — | `7f2b8a1` | 2026-10-21 01:41 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Bandeau de confirmation fermable après la création d’un message direct (« Message direct créé. »), d’un groupe (« Groupe « … » créé. ») et après la suppression d’une conversation (« Conversation « … » supprimée. »). Il disparaît dès qu’une nouvelle action démarre. (#267)
- Liste de conversations vide : l’état « Aucune conversation » s’accompagne de la description « Créez un message ou un groupe pour commencer. » Pendant le chargement, un squelette remplace la liste. (#267)
- Lien d’évitement unique placé avant la navigation répétée. (#267)

#### Changements de comportement
- Nouveau message à un contact : si une conversation directe existe déjà avec lui (`kind: 'direct'` et son `contactId`), le message est publié dans cette conversation par `POST /conversations/{id}/messages` et elle s’ouvre. Avant, `POST /direct-messages` créait toujours un nouveau fil. Seul un contact sans conversation directe passe par `POST /direct-messages`. Un envoi refusé conserve le brouillon et ne crée pas d’autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Création d’un message direct ou d’un groupe : une réponse sans identifiant de conversation ou de message confirmé provoque désormais une erreur et conserve le brouillon (« La création du message direct n’a pas été confirmée. Le brouillon est conservé. », « La création du groupe n’a pas été confirmée. Le brouillon est conservé. »). (#267)
- Les couleurs de fond et de texte viennent des variables du thème partagé (`--mairie-*`). (#267)

#### Technique
- Déploiement pour staging et prod : `cicd.yml` ne déclenche plus que `release-dev` sur `main`. Staging et prod passent par les workflows manuels `promote-staging.yml` et `promote-prod.yml` (MAIR-494, [#287](https://github.com/mairie360/Messages_Web_Service/pull/287)). Le lockfile `follow-redirects` 1.16.1 débloque `npm audit`, selon la description de la PR (lockfile absent du diff fourni).
- Contrat BFF : `@mairie360/bff-message-openapi` est passé à `1.0.0` (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis à `0.0.0-dev.9cb0aa6…` (MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279)), puis à `0.0.0-staging.815c7323…` (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)). L’état final de la plage est le paquet staging. `scripts/contract-version.mjs` accepte désormais `0.0.0-staging.<sha40>`.
- Stacks de test (`docker-compose*.yml`) : images `bff-message` alignées sur `staging-815c732`, et `database` / `liquibase-migrations` en `3.2.0`, `message-api` en `2.0.0`, `core-api` en `2.1.0` (MAIR-569, #269 ; MAIR-575, #279 ; MAIR-600, #281).
- Socle partagé : `@mairie360/lib-components` passe de 0.8.0 à 0.9.0 (#267), puis à 0.10.2 (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273)). `@mairie360/front-kit` et son archive vendored sont supprimés, sans changement de comportement. `braces` est vendored en dev avec sa licence (#267).
- CICD : `mairie360/CICD` épinglé à v4.3.1 (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271)), puis v4.3.2 avec pin par SHA et tag suivi par Renovate (MAIR-571, [#275](https://github.com/mairie360/Messages_Web_Service/pull/275)). Les secrets du journal de release sont transmis.
- Sécurité CI et image (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)) : Node 24.21.0 dans Docker et CI, token en lecture seule par défaut, `push` limité à `main`, token passé en BuildKit secret.
- Tests : `tests/bundle/client-bundle.test.cjs` vérifie que le bundle client n’embarque aucune entrée lib inutilisée (MAIR-126, [#277](https://github.com/mairie360/Messages_Web_Service/pull/277)). Il est lancé par `frontend-performance.yml` via `npm run test:bundle` (#273).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Le dépôt ne publie plus automatiquement sur staging ni sur prod : un push sur `main` s’arrête à `release-dev`. Staging et prod se déclenchent à la main avec `promote-staging.yml` et `promote-prod.yml` (MAIR-494, [#287](https://github.com/mairie360/Messages_Web_Service/pull/287)).
- Pas de changement fonctionnel pour les utilisateurs dans cette plage ; la PR ajoute aussi la pinning de `mairie360/CICD` en v4.4.0 et l’épinglage de `renovate.json`.

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Bandeau de confirmation fermable après la création d’un message direct (« Message direct créé. »), d’un groupe (« Groupe « … » créé. ») et après la suppression d’une conversation (« Conversation « … » supprimée. »). Il disparaît dès qu’une nouvelle action démarre. (#267)
- Liste de conversations vide : l’état « Aucune conversation » s’accompagne de la description « Créez un message ou un groupe pour commencer. » Pendant le chargement, un squelette remplace la liste. (#267)
- Lien d’évitement unique placé avant la navigation répétée. (#267)

#### Changements de comportement
- Nouveau message à un contact : si une conversation directe existe déjà avec lui (`kind: 'direct'` et son `contactId`), le message est publié dans cette conversation par `POST /conversations/{id}/messages` et elle s’ouvre. Avant, `POST /direct-messages` créait toujours un nouveau fil. Seul un contact sans conversation directe passe par `POST /direct-messages`. Un envoi refusé conserve le brouillon et ne crée pas d’autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Création d’un message direct ou d’un groupe : une réponse sans identifiant de conversation ou de message confirmé provoque désormais une erreur et conserve le brouillon (« La création du message direct n’a pas été confirmée. Le brouillon est conservé. », « La création du groupe n’a pas été confirmée. Le brouillon est conservé. »). (#267)
- Les couleurs de fond et de texte viennent des variables du thème partagé (`--mairie-*`). (#267)

#### Technique
- Contrat BFF : `@mairie360/bff-message-openapi` est passé à `1.0.0` (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis à `0.0.0-dev.9cb0aa6…` (MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279)), puis à `0.0.0-staging.815c7323…` (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)). L’état final de la plage est le paquet staging, et `scripts/contract-version.mjs` accepte désormais `0.0.0-staging.<sha40>`.
- Stacks de test (`docker-compose*.yml`) : image `bff-message` alignée sur `staging-815c732`, `database` et `liquibase-migrations` en `3.2.0`, `message-api` en `2.0.0`, `core-api` en `2.1.0` (#269, #279, #281).
- Socle partagé : `@mairie360/lib-components` passe de 0.8.0 à 0.9.0 (#267), puis à 0.10.2 (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273)). `@mairie360/front-kit` et son archive vendored sont supprimés, sans changement de comportement. `braces` est vendored en dev avec sa licence (#267).
- CICD : `mairie360/CICD` épinglé à v4.3.1 (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271)), puis v4.3.2 avec pin par SHA suivi par Renovate (MAIR-571, [#275](https://github.com/mairie360/Messages_Web_Service/pull/275)). Les secrets du journal de release sont transmis.
- Sécurité CI et image (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)) : Node 24.21.0 dans Docker et CI, token en lecture seule par défaut, `push` limité à `main`, token passé en BuildKit secret.
- Tests : `tests/bundle/client-bundle.test.cjs` vérifie que le bundle client n’embarque aucune entrée lib inutilisée (MAIR-126, [#277](https://github.com/mairie360/Messages_Web_Service/pull/277)), lancé par `frontend-performance.yml`.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 01:41 UTC | dev | — | `7f2b8a1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39528137691) |
| 2026-10-20 19:02 UTC | staging | — | `500ac41` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39478543240) |
| 2026-10-20 18:57 UTC | dev | — | `500ac41` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39478543240) |
| 2026-10-20 13:42 UTC | dev | — | `9856e2c` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39431943853) |
| 2026-10-20 12:23 UTC | dev | — | `fcb38f1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39421323652) |
| 2026-10-19 22:13 UTC | dev | — | `65902bb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39332830353) |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
