# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "updated": {"dev": "2026-10-20 18:57 UTC", "staging": "2026-10-20 19:02 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `500ac41` | 2026-10-20 19:02 UTC |
| dev | — | `500ac41` | 2026-10-20 18:57 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Les actions confirmées affichent un message de succès refermable : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. ». Ce message disparaît au début de l'action suivante ou au changement de compte. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un squelette de chargement s'affiche pendant le chargement initial des conversations. Une liste vide affiche « Aucune conversation » avec l'invite « Créez un message ou un groupe pour commencer. ». (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La messagerie adopte le thème partagé de `@mairie360/lib-components` (couleurs via les variables `--mairie-*`, clair et sombre). Le lien d'évitement précède la navigation répétée. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- La création d'un message direct ou d'un groupe n'est acceptée que si la réponse du BFF la confirme : identifiants serveur présents, message rattaché à la conversation, nom de groupe non vide. Sinon le brouillon est conservé et l'erreur « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » (ou son équivalent pour le groupe) s'affiche. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact créait jusqu'ici une nouvelle conversation à chaque envoi via `POST /direct-messages`. Désormais, si une conversation directe existe avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages`, cette conversation s'ouvre et le message « Message envoyé dans la conversation existante. » s'affiche. Seul un contact sans conversation directe passe par `POST /direct-messages`. Un envoi refusé ou non confirmé conserve le brouillon (« Le message n’a pas pu être envoyé. ») et ne crée jamais un autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances, sans changement de contrat :
  - Le contrat `@mairie360/bff-message-openapi` passe à `1.0.0`, puis à `0.0.0-staging.815c7323097815c25416a17fb667b635af10c22c`, avec les images de test `bff-message` alignées et l'acceptation des paquets `0.0.0-staging.<sha40>` par la politique de version.
  - Le socle partagé passe de `@mairie360/front-kit` à `@mairie360/lib-components` `0.10.2`.
  - (MAIR-569, MAIR-575, MAIR-600, MAIR-126, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#279](https://github.com/mairie360/Messages_Web_Service/pull/279), [#281](https://github.com/mairie360/Messages_Web_Service/pull/281), [#273](https://github.com/mairie360/Messages_Web_Service/pull/273))
- CI et tests (4 PR) : jeton de workflow en lecture seule et push limité à `main`, CICD montée en v4.3.1 puis v4.3.2 avec journal des releases, test de bundle client par AST. (MAIR-436, MAIR-571, MAIR-126, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Les actions confirmées affichent un message de succès refermable : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. ». Ce message disparaît au début de l'action suivante ou au changement de compte. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Un squelette de chargement s'affiche pendant le chargement initial des conversations. Une liste vide affiche « Aucune conversation » avec l'invite « Créez un message ou un groupe pour commencer. ». (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La messagerie adopte le thème partagé de `@mairie360/lib-components` (couleurs via les variables `--mairie-*`, clair et sombre). Le lien d'évitement précède la navigation répétée. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- La création d'un message direct ou d'un groupe n'est acceptée que si la réponse du BFF la confirme : identifiants serveur présents, message rattaché à la conversation, nom de groupe non vide. Sinon le brouillon est conservé et l'erreur « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » (ou son équivalent pour le groupe) s'affiche. (MAIR-526, MAIR-515, MAIR-540, [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact créait jusqu'ici une nouvelle conversation à chaque envoi via `POST /direct-messages`. Désormais, si une conversation directe existe avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié via `POST /conversations/{id}/messages`, cette conversation s'ouvre et le message « Message envoyé dans la conversation existante. » s'affiche. Seul un contact sans conversation directe passe par `POST /direct-messages`. Un envoi refusé ou non confirmé conserve le brouillon (« Le message n’a pas pu être envoyé. ») et ne crée jamais un autre fil. (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances, sans changement de contrat :
  - Le contrat `@mairie360/bff-message-openapi` passe à `1.0.0`, puis à `0.0.0-staging.815c7323097815c25416a17fb667b635af10c22c`, avec les images de test `bff-message` alignées et l'acceptation des paquets `0.0.0-staging.<sha40>` par la politique de version.
  - Le socle partagé passe de `@mairie360/front-kit` à `@mairie360/lib-components` `0.10.2`.
  - (MAIR-569, MAIR-575, MAIR-600, MAIR-126, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#279](https://github.com/mairie360/Messages_Web_Service/pull/279), [#281](https://github.com/mairie360/Messages_Web_Service/pull/281), [#273](https://github.com/mairie360/Messages_Web_Service/pull/273))
- CI et tests (4 PR) : jeton de workflow en lecture seule et push limité à `main`, CICD montée en v4.3.1 puis v4.3.2 avec journal des releases, test de bundle client par AST. (MAIR-436, MAIR-571, MAIR-126, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264), [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 19:02 UTC | staging | — | `500ac41` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39478543240) |
| 2026-10-20 18:57 UTC | dev | — | `500ac41` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39478543240) |
| 2026-10-20 13:42 UTC | dev | — | `9856e2c` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39431943853) |
| 2026-10-20 12:23 UTC | dev | — | `fcb38f1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39421323652) |
| 2026-10-19 22:13 UTC | dev | — | `65902bb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39332830353) |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
