# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "7e2e0beec4de3b0535feca7910cc82b95a63e6f2", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "updated": {"dev": "2026-10-21 10:50 UTC", "staging": "2026-10-20 19:02 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `500ac41` | 2026-10-20 19:02 UTC |
| dev | — | `7e2e0be` | 2026-10-21 10:50 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Les conversations sans contenu affichent désormais un état vide explicite « Aucune conversation » avec la description « Créez un message ou un groupe pour commencer. » (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un message de confirmation réussi s'affiche après la création d'un message direct « Message direct créé. », la création d'un groupe « Groupe « nom » créé. » et la suppression d'une conversation « Conversation « nom » supprimée. ». Il se ferme à la demande et disparaît à l'action suivante ou au changement de compte. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un squelette de chargement s'affiche pendant la lecture des conversations (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un lien d'évitement unique précède la navigation répétée et mène à la zone principale (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe (`kind: 'direct'` avec son `contactId`) publie dans cette conversation via `POST /conversations/{id}/messages` et l'ouvre. Seul un contact sans conversation directe crée un fil via `POST /direct-messages`. Un envoi refusé ou non confirmé conserve le brouillon et ne crée jamais un autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Si la conversation existante n'est pas confirmée, l'erreur affichée est « L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation. » et l'échec standard est « Le message n’a pas pu être envoyé. » (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Avant : une réponse de création de message direct était acceptée sans vérification. Maintenant, si la conversation ou le message manque, ou si la conversation du message diffère, l'erreur « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » est affichée (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Avant : la création de groupe était acceptée sans vérification. Maintenant, une réponse sans conversation ou sans nom affiche « La création du groupe n’a pas été confirmée. Le brouillon est conservé. » (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Contrat BFF_Message : passage de `0.0.0-dev` à `1.0.0` (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)), puis au paquet `0.0.0-dev.9cb0aa6` (MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279)), puis au paquet `0.0.0-staging.815c732` avec l'image `staging-815c732` (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)). Le paquet `0.0.0-staging` est accepté par la politique de version et la documentation est mise à jour.
- Stacks de test (`docker-compose*.yml`) : images des API et de la base portées sur des versions de release (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)).
- Dépendances : `@mairie360/front-kit` vendoré supprimé, `@mairie360/lib-components` passé de 0.9.0 à 0.10.2 avec des imports par sous-chemin (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273)). Une vérification du bundle client est ajoutée (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273) et [#277](https://github.com/mairie360/Messages_Web_Service/pull/277)).
- CI : `mairie360/CICD` épinglé en v4.3.2 puis v4.3.1 avec secrets du journal de release (MAIR-571, [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271)).
- CI : permissions en lecture seule par défaut, `push` limité à `main` pour `cicd.yml` et `contracts.yml` (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)).
- Adoption du thème partagé et des feuilles de style de lib-components via des variables CSS (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267)).
- Rétrogradation : des paquets vendorés `braces` ajoutés en dépendance de développement (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267)).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Renovate remonte `mairie360/CICD` de v4.4.0 à v4.4.3 dans `cicd.yml`, `dev-dependency-exception.yml` et les nouveaux workflows de promotion (([#284](https://github.com/mairie360/Messages_Web_Service/pull/284))).
- MAIR-494 ([#287](https://github.com/mairie360/Messages_Web_Service/pull/287)) : un push sur `main` s'arrête à `release-dev`, staging et prod ne se déclenchent plus automatiquement. Deux workflows manuels `promote-staging.yml` et `promote-prod.yml` ont été ajoutés, avec verrou par cible et même épingle CICD. La configuration Renovate et le test `tests/cicd-pin.test.cjs` suivent les huit références CICD. La documentation `CLAUDE.md` décrit la promotion. Selon la description de la PR, `follow-redirects` passe en 1.16.1 dans le lockfile pour débloquer `npm audit`.

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Les conversations sans contenu affichent désormais un état vide explicite « Aucune conversation » avec la description « Créez un message ou un groupe pour commencer. » (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un message de confirmation réussi s'affiche après la création d'un message direct, la création d'un groupe et la suppression d'une conversation ; il se ferme à la demande (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un squelette de chargement s'affiche pendant la lecture des conversations, et un lien d'évitement unique précède la navigation (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- « Nouveau message » vers un contact qui a déjà une conversation directe publie dans cette conversation via `POST /conversations/{id}/messages` au lieu de créer un nouveau fil via `POST /direct-messages`. Un envoi refusé conserve le brouillon sans créer d'autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))
- Les créations de message direct et de groupe vérifient désormais la réponse : une création non confirmée affiche une erreur et conserve le brouillon (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Technique
- Contrat BFF_Message passé à `0.0.0-staging.815c732` avec l'image `staging-815c732` dans les stacks (MAIR-600, [#281](https://github.com/mairie360/Messages_Web_Service/pull/281)). Le contrat lui-même n'a pas changé.
- Contrat BFF_Message passé à `0.0.0-dev.9cb0aa6` (MAIR-575, [#279](https://github.com/mairie360/Messages_Web_Service/pull/279)), après la version `1.0.0` (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269)).
- Dépendances : `@mairie360/front-kit` vendoré supprimé et `@mairie360/lib-components` en 0.10.2 avec imports par sous-chemin, plus un test de bundle client (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277)).
- CI : `mairie360/CICD` en v4.3.2 puis v4.3.1 avec secrets du journal de release, et tests d'épinglage (MAIR-571, [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271)).
- CI : permissions en lecture seule par défaut et `push` limité à `main` (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264)).
- Thème partagé et feuilles de style de lib-components adoptés, et paquets `braces` vendorés en développement (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
