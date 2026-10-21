# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "58f03ae8f654f9b8a91f63d0cf315c305f03295c", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "updated": {"dev": "2026-10-21 10:54 UTC", "staging": "2026-10-20 19:02 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `500ac41` | 2026-10-20 19:02 UTC |
| dev | — | `58f03ae` | 2026-10-21 10:54 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Écran Messages : pendant le chargement des conversations, un squelette (`Skeleton`) remplace le simple texte d’attente. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Liste de conversations vide : un état vide (`EmptyState`) affiche « Aucune conversation » avec le texte « Créez un message ou un groupe pour commencer. » ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Retours de confirmation : un toast de succès, fermable, affiche « Message direct créé. », « Groupe « … » créé. » ou « Conversation « … » supprimée. ». Il disparaît à la prochaine opération. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe : le message est publié dans cette conversation (`POST /conversations/{id}/messages`), qui s’ouvre ; seul un contact sans conversation directe crée un fil via `POST /direct-messages`. Un envoi refusé conserve le brouillon et ne crée pas un autre fil. Confirmation affichée : « Message envoyé dans la conversation existante. » (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Apparence : les couleurs passent par le thème partagé de `@mairie360/lib-components` (variables `--mairie-*`) ; le fichier local `municipal-theme.css` est supprimé. Diff tronqué, le détail visuel n’est pas entièrement vérifiable. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- Création de message direct : avant, la réponse n’était pas contrôlée ; maintenant, une réponse sans identifiant de conversation ou de message confirmé affiche « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Création de groupe : avant, la réponse n’était pas contrôlée ; maintenant, une réponse sans conversation confirmée ou sans nom affiche « La création du groupe n’a pas été confirmée. Le brouillon est conservé. » ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Front : `@mairie360/front-kit` (archive vendored) remplacé par les sous-chemins de `@mairie360/lib-components` 0.10.2 ; test `npm run test:bundle` ajouté au workflow de performance. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
- Contrat OpenAPI `@mairie360/bff-message-openapi` : 0.0.0-dev.ad5339c → 1.0.0 (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis 0.0.0-dev.9cb0aa6 (MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279)), puis 0.0.0-staging.815c732 (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)) ; images `bff-message` des compose alignées, images API et base des stacks de test passées à des releases.
- CI : jeton en lecture seule par défaut, push limité à `main`, `tests/workflow-permissions.test.cjs` (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)) ; CICD passé de v4.3.2 à v4.4.3 avec secrets du journal de release (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#284](https://github.com/mairie360/Messages_Web_Service/pull/284)).
- Promotion staging et prod manuelle via `promote-staging.yml` et `promote-prod.yml` (MAIR-494, [#287](https://github.com/mairie360/Messages_Web_Service/pull/287)) ; `follow-redirects` 1.16.1 dans le lockfile.
- Dépendances de développement : backport `braces` vendored (MIT, provenance) ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267)).
- Diffs tronqués pour #281 et #267 : seuls les fichiers visibles sont décrits.

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Stacks `docker-compose*.yml` : `ghcr.io/mairie360/database` et `liquibase-migrations` passent de 3.2.0 à 3.3.0 ; le diff ne montre que les tags, le contenu du schéma n’est pas visible ici. ([#294](https://github.com/mairie360/Messages_Web_Service/pull/294))
- Workflow CICD réutilisable passé de v4.4.0 à v4.4.3 (correctif de la séparation promotion staging/prod) ; dépendances de test (`follow-redirects`). ([#284](https://github.com/mairie360/Messages_Web_Service/pull/284))
- `cicd.yml` s’arrête à `release-dev` : un push sur `main` ne lance plus staging ni prod. La promotion staging et prod se fait à la main via `promote-staging.yml` et `promote-prod.yml`, avec verrou par cible. ([#287](https://github.com/mairie360/Messages_Web_Service/pull/287))

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Écran Messages : squelette pendant le chargement, état vide « Aucune conversation » avec invite de création, toasts de confirmation fermables (« Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. »). ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact déjà relié à une conversation directe : le message est publié dans cette conversation (`POST /conversations/{id}/messages`) et elle s’ouvre ; `POST /direct-messages` n’est utilisé que pour un contact sans conversation directe. Un envoi refusé conserve le brouillon sans créer un autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Apparence : couleurs issues du thème partagé de `@mairie360/lib-components` 0.9.0 ; `municipal-theme.css` supprimé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- Création de message direct et de groupe : avant, la réponse n’était pas contrôlée ; maintenant, une réponse non confirmée affiche une erreur et le brouillon est conservé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Front-kit remplacé par `@mairie360/lib-components` 0.10.2 (sous-chemins), vérification `npm run test:bundle` du bundle client. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
- Contrat `@mairie360/bff-message-openapi` passé à 1.0.0 (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis au paquet dev 9cb0aa6 (MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279)), puis au paquet staging 815c732 avec `scripts/contract-version.mjs` qui accepte les paquets staging (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)) ; diff tronqué.
- Images des stacks de test : core-api 2.1.0, database 3.2.0, message-api 2.0.0. ([#269](https://github.com/mairie360/Messages_Web_Service/pull/269))
- CI : jeton en lecture seule par défaut, push limité à `main`, CICD v4.3.2 puis v4.4.3, secrets du journal de release (MAIR-436, MAIR-571, MAIR-494 ; [#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#284](https://github.com/mairie360/Messages_Web_Service/pull/284)).
- Backport `braces` vendored pour le développement uniquement. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
