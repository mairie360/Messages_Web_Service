# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-10-21 10:59 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `9b14d68` | 2026-10-21 10:59 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Nouveau message à un contact : si une conversation directe existe déjà avec ce contact, le message y est publié (`POST /conversations/{id}/messages`) et cette conversation s’ouvre. Seul un contact sans conversation directe obtient un nouveau fil via `POST /direct-messages`. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Confirmations fermables à la main : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. » et « Message envoyé dans la conversation existante. » s’affichent après une action réussie. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Liste des conversations : placeholder de chargement pendant le chargement, et état vide « Aucune conversation » accompagné de « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un lien d’évitement unique précède la navigation répétée. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- Nouveau message à un contact : un envoi refusé dans la conversation existante affiche l’erreur, conserve le brouillon et ne crée jamais un autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Apparence : les couleurs de fond, de texte et d’accent passent par les variables de la feuille partagée `@mairie360/lib-components/styles.css`, et `municipal-theme.css` est supprimée. Le rendu visuel peut donc changer. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- Message direct : avant, une réponse sans identifiant de conversation ou de message, ou dont le message n’appartient pas à la conversation, était acceptée comme un succès. Maintenant, l’erreur « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » s’affiche et le brouillon reste. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Groupe : avant, une réponse sans identifiant ni nom était acceptée. Maintenant, l’erreur « La création du groupe n’a pas été confirmée. Le brouillon est conservé. » s’affiche. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Contrat BFF : `@mairie360/bff-message-openapi` passe de `0.0.0-dev.ad5339c` à `1.0.0` (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis à `1.1.0` (MAIR-612, [#295](https://github.com/mairie360/Messages_Web_Service/pull/295)). `contracts/openapi.json` est régénéré, seule la source change dans le diff.
- Stacks de test (`docker-compose*.yml`) : core-api en 2.2.0 ([#292](https://github.com/mairie360/Messages_Web_Service/pull/292)), database et liquibase-migrations en 3.3.0 ([#294](https://github.com/mairie360/Messages_Web_Service/pull/294)), message-api en 2.1.0 et bff-message en 1.1.0 ([#295](https://github.com/mairie360/Messages_Web_Service/pull/295)). Le diff ne contient pas le contenu des migrations 3.3.0, donc leur effet en base n’est pas vérifiable ici.
- Socle front : migration de `@mairie360/front-kit` vers les sous-chemins de `@mairie360/lib-components` 0.10.2, archive vendorisée supprimée (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273)). Test `npm run test:bundle` ajouté au workflow de performance puis renforcé ([#277](https://github.com/mairie360/Messages_Web_Service/pull/277)). lib-components passe de 0.8.0 à 0.9.0 ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267)), puis à 0.10.2.
- Rétro-portage de `braces` en développement seul dans `vendor/` ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267)).
- Politique de contrat : `scripts/contract-version.mjs` accepte `0.0.0-staging.<sha40>` (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)). Les versions dev des stacks ont été fixées pour MAIR-575 ([#279](https://github.com/mairie360/Messages_Web_Service/pull/279)).
- CI/CD : `mairie360/CICD` passe de v4.3.2 à v4.4.3 ([#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#284](https://github.com/mairie360/Messages_Web_Service/pull/284), [#295](https://github.com/mairie360/Messages_Web_Service/pull/295)). Le journal des releases reçoit ses secrets dédiés ([#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275)).
- Promotion : `promote-staging.yml` et `promote-prod.yml` sont ajoutés (MAIR-494, [#287](https://github.com/mairie360/Messages_Web_Service/pull/287)). Une poussée sur `main` ne déclenche plus staging ni prod ; la promotion est manuelle.
- Droits CI : `cicd.yml` et `contracts.yml` tournent sur push uniquement sur `main`, et le token est en lecture seule par défaut (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)).

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Nouveau message à un contact : si une conversation directe existe déjà avec ce contact, le message y est publié (`POST /conversations/{id}/messages`) et cette conversation s’ouvre. Seul un contact sans conversation directe obtient un nouveau fil via `POST /direct-messages`. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Confirmations fermables à la main : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. » et « Message envoyé dans la conversation existante. » s’affichent après une action réussie. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Liste des conversations : placeholder de chargement pendant le chargement, et état vide « Aucune conversation » accompagné de « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un lien d’évitement unique précède la navigation répétée. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- Nouveau message à un contact : un envoi refusé dans la conversation existante affiche l’erreur, conserve le brouillon et ne crée jamais un autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Apparence : les couleurs de fond, de texte et d’accent passent par les variables de la feuille partagée `@mairie360/lib-components/styles.css`, et `municipal-theme.css` est supprimée. Le rendu visuel peut donc changer. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- Message direct : avant, une réponse sans identifiant de conversation ou de message, ou dont le message n’appartient pas à la conversation, était acceptée comme un succès. Maintenant, l’erreur « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » s’affiche et le brouillon reste. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Groupe : avant, une réponse sans identifiant ni nom était acceptée. Maintenant, l’erreur « La création du groupe n’a pas été confirmée. Le brouillon est conservé. » s’affiche. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Contrat BFF : `@mairie360/bff-message-openapi` passe de `0.0.0-dev.ad5339c` à `1.0.0` (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis à `1.1.0` (MAIR-612, [#295](https://github.com/mairie360/Messages_Web_Service/pull/295)). `contracts/openapi.json` est régénéré, seule la source change dans le diff.
- Stacks de test (`docker-compose*.yml`) : core-api en 2.2.0 ([#292](https://github.com/mairie360/Messages_Web_Service/pull/292)), database et liquibase-migrations en 3.3.0 ([#294](https://github.com/mairie360/Messages_Web_Service/pull/294)), message-api en 2.1.0 et bff-message en 1.1.0 ([#295](https://github.com/mairie360/Messages_Web_Service/pull/295)). Le diff ne contient pas le contenu des migrations 3.3.0, donc leur effet en base n’est pas vérifiable ici.
- Socle front : migration de `@mairie360/front-kit` vers les sous-chemins de `@mairie360/lib-components` 0.10.2, archive vendorisée supprimée (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273)). Test `npm run test:bundle` ajouté au workflow de performance puis renforcé ([#277](https://github.com/mairie360/Messages_Web_Service/pull/277)). lib-components passe de 0.8.0 à 0.9.0 ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267)), puis à 0.10.2.
- Rétro-portage de `braces` en développement seul dans `vendor/` ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267)).
- Politique de contrat : `scripts/contract-version.mjs` accepte `0.0.0-staging.<sha40>` (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)). Les versions dev des stacks ont été fixées pour MAIR-575 ([#279](https://github.com/mairie360/Messages_Web_Service/pull/279)).
- CI/CD : `mairie360/CICD` passe de v4.3.2 à v4.4.3 ([#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#284](https://github.com/mairie360/Messages_Web_Service/pull/284), [#295](https://github.com/mairie360/Messages_Web_Service/pull/295)). Le journal des releases reçoit ses secrets dédiés ([#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275)).
- Promotion : `promote-staging.yml` et `promote-prod.yml` sont ajoutés (MAIR-494, [#287](https://github.com/mairie360/Messages_Web_Service/pull/287)). Une poussée sur `main` ne déclenche plus staging ni prod ; la promotion est manuelle.
- Droits CI : `cicd.yml` et `contracts.yml` tournent sur push uniquement sur `main`, et le token est en lecture seule par défaut (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 11:04 UTC | staging | — | `9b14d68` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39588760285) |
| 2026-10-21 10:59 UTC | dev | — | `9b14d68` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39586552938) |
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
