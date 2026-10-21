# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "updated": {"dev": "2026-10-21 10:59 UTC", "staging": "2026-10-20 19:02 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `500ac41` | 2026-10-20 19:02 UTC |
| dev | — | `9b14d68` | 2026-10-21 10:59 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Un message d'état vide explicite « Aucune conversation » s'affiche avec le texte « Créez un message ou un groupe pour commencer. » quand la liste est vide, au lieu d'un libellé seul. (2f8e055, MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Pendant le chargement des conversations en erreur ou en attente, un squelette de chargement est affiché. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Une notification de succès (fermable) confirme la création d'un message direct (« Message direct créé. »), la création d'un groupe (« Groupe « nom » créé. »), la suppression d'une conversation (« Conversation « nom » supprimée. ») et l'envoi dans une conversation existante. Elle disparaît au changement de compte ou à l'opération suivante. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un lien d'évitement unique précède la navigation répétée. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe publie désormais le message dans cette conversation (`POST /conversations/{id}/messages`) et l'ouvre ; seul un contact sans conversation directe crée un fil via `POST /direct-messages`. Un envoi refusé conserve le brouillon et ne crée jamais un autre fil. Avant, chaque « Nouveau message » créait une nouvelle conversation. (45d5270, MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- La création d'un message direct ou d'un groupe n'est plus considérée comme réussie si la réponse ne confirme pas la conversation : une erreur « La création ... n'a pas été confirmée. Le brouillon est conservé. » s'affiche. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Le thème municipal local (`municipal-theme.css`) est remplacé par la feuille de style partagée de `@mairie360/lib-components` (variables `--mairie-*`) : les couleurs et le rendu de l'interface changent. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Dépendance `@mairie360/lib-components` passée de 0.8.0 à 0.9.0 puis les imports de `front-kit` migrés vers les sous-chemins de `@mairie360/lib-components` (sans changement de comportement attendu) et archive `vendor/front-kit` supprimée. (2f8e055 et 8c9f0a3, MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273))
- Nouveau test de bundle client (`npm run test:bundle`) et contrôle des imports de la lib. (65902bb, MAIR-126, [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
- Contrat BFF : `@mairie360/bff-message-openapi` passe de `0.0.0-dev` à `1.0.0` (8b9f4e9, MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis à `0.0.0-staging` (500ac41, MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)) et à `1.1.0` (9b14d68, MAIR-612, [#295](https://github.com/mairie360/Messages_Web_Service/pull/295)) ; `contracts/openapi.json` ne change que sa version source dans les diffs.
- Stacks de test : images `core-api`, `database`, `liquibase-migrations`, `message-api` et `bff-message` passées à leurs versions de release (8b9f4e9, 233703a, 58f03ae, 9b14d68).
- CI : CICD passe de v4.2.1 à v4.4.3 (d74d7fa, fcb38f1, 7e2e0be) ; workflows réduits en permissions (`contents: read` par défaut, a5e8d11, MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)) ; ajout des workflows manuels `promote-staging` et `promote-prod` (7f2b8a1, MAIR-494, [#287](https://github.com/mairie360/Messages_Web_Service/pull/287)).
- Image Node pinnée à 24.21.0 pour CI et Docker, documentation alignée (a5e8d11, MAIR-436).
- Journal des releases rédigé par Claude activé dans le pipeline (fcb38f1, MAIR-571, [#275](https://github.com/mairie360/Messages_Web_Service/pull/275)).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Contrat BFF épinglé à `@mairie360/bff-message-openapi` `1.1.0` (au lieu du paquet `0.0.0-staging.815c732…`), avec l'image `bff-message` `1.1.0` et `message-api` `2.1.0` dans les stacks de test (9b14d68, MAIR-612, [#295](https://github.com/mairie360/Messages_Web_Service/pull/295)). Le diff ne détaille pas les routes du contrat.
- Stacks de test : `core-api` passe à `2.2.0` (233703a, [#292](https://github.com/mairie360/Messages_Web_Service/pull/292)) ; `database` et `liquibase-migrations` à `3.3.0` (58f03ae, [#294](https://github.com/mairie360/Messages_Web_Service/pull/294)).
- CICD passe à v4.4.3 (7e2e0be, [#284](https://github.com/mairie360/Messages_Web_Service/pull/284)).
- CI : nouveaux workflows manuels `promote-staging.yml` et `promote-prod.yml` ; `cicd.yml` passe en CICD v4.4.0 et ne lance plus staging ou prod sur un push vers `main` ; `follow-redirects` 1.16.1 dans le lockfile (7f2b8a1, MAIR-494, [#287](https://github.com/mairie360/Messages_Web_Service/pull/287)).

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Un message d'état vide explicite « Aucune conversation » avec le texte « Créez un message ou un groupe pour commencer. » s'affiche quand la liste est vide ; un squelette de chargement est affiché pendant le chargement. (2f8e055, MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Une notification de succès fermable confirme la création d'un message direct, la création d'un groupe, la suppression d'une conversation et l'envoi dans une conversation existante. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un lien d'évitement unique précède la navigation répétée. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe publie le message dans cette conversation (`POST /conversations/{id}/messages`) au lieu de créer un nouveau fil via `POST /direct-messages`, qui reste réservé aux contacts sans conversation directe. Un envoi refusé conserve le brouillon sans créer un autre fil. (45d5270, MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- La création d'un message direct ou d'un groupe échoue si la réponse ne confirme pas la conversation : le message « n'a pas été confirmée » s'affiche et le brouillon est conservé. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Le thème municipal local est remplacé par la feuille de style partagée de `@mairie360/lib-components` : les couleurs et le rendu changent. (2f8e055, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- `@mairie360/lib-components` passe à 0.9.0, puis les imports `front-kit` sont migrés vers les sous-chemins de `@mairie360/lib-components` (sans changement de comportement attendu) et l'archive `vendor/front-kit` est supprimée (8c9f0a3, MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273)) ; test de bundle client ajouté (65902bb, [#277](https://github.com/mairie360/Messages_Web_Service/pull/277)).
- Contrat BFF : `0.0.0-dev` vers `0.0.0-dev` (9856e2c, MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279)), puis `0.0.0-staging` (500ac41, MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)) et `1.0.0` (8b9f4e9, MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)) ; le contrat en prod est donc la version `1.0.0`.
- Stacks de test : images `database`, `liquibase-migrations`, `message-api`, `core-api` et `bff-message` passées à leurs versions de release (8b9f4e9).
- CI : CICD passe à v4.3.1 puis v4.3.2 et v4.4.3 (d74d7fa, fcb38f1, MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275)) ; permissions du workflow réduites à `contents: read` par défaut et déclenchement sur `main` seulement (a5e8d11, MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)) ; Node 24.21.0 pour CI et Docker.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
