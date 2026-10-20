# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "500ac41961953f47094cebad88e0fd4ecdb2a3fb", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "d950efef13cf04bf526892c50bc7efb61a5529a3", "updated": {"dev": "2026-10-20 18:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `d950efe` | — |
| dev | — | `500ac41` | 2026-10-20 18:57 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Après une action confirmée, un message de succès refermable s'affiche : `Message direct créé.`, `Groupe « <nom> » créé.` ou `Conversation « <nom> » supprimée.` Il disparaît au lancement d'une nouvelle action ou au changement de compte. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- L'interface adopte le thème partagé de `@mairie360/lib-components` (feuille de style commune et couleurs par variables `--mairie-*`, à la place du thème municipal local). Le chargement des conversations affiche un squelette. Une liste vide affiche « Aucune conversation » avec l'invite « Créez un message ou un groupe pour commencer. » ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- La création d'un message direct ou d'un groupe n'est acceptée que si la réponse du BFF la confirme : identifiants de la conversation et du message cohérents, nom de groupe non vide. Sinon, l'erreur `La création du message direct n’a pas été confirmée. Le brouillon est conservé.` ou `La création du groupe n’a pas été confirmée. Le brouillon est conservé.` s'affiche et le brouillon est gardé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact :
  - Avant : chaque envoi appelait `POST /direct-messages` et ouvrait une nouvelle conversation, si bien que les fils avec un même contact s'empilaient.
  - Maintenant, s'il existe déjà une conversation directe avec ce contact (`kind: 'direct'` et son `contactId`) : le message y est publié via `POST /conversations/{id}/messages`, cette conversation s'ouvre et le message `Message envoyé dans la conversation existante.` s'affiche.
  - Seul un contact sans conversation directe passe encore par `POST /direct-messages`.
  - En cas de refus ou de réponse non confirmée, le brouillon est conservé et aucun autre fil n'est créé à la place. Les messages affichés sont `Le message n’a pas pu être envoyé.` ou `L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation.` (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances, sans changement de comportement annoncé :
  - Le socle partagé passe de l'archive `@mairie360/front-kit` à `@mairie360/lib-components` `0.10.2` (sous-chemins `next`, `guard`, `browser`, `shared`, `react`, `theme`), avec un test vérifiant le contenu du bundle client. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
  - Le contrat `@mairie360/bff-message-openapi` et les images des stacks de test sont successivement réalignés : `1.0.0`, puis `0.0.0-dev.9cb0aa6…`, puis `0.0.0-staging.815c732…`. La politique de version accepte désormais les paquets `0.0.0-staging.<sha40>`. (MAIR-569, MAIR-575, MAIR-600, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#279](https://github.com/mairie360/Messages_Web_Service/pull/279), [#281](https://github.com/mairie360/Messages_Web_Service/pull/281))
- CI (3 PR) :
  - Jeton du workflow en lecture seule par défaut et `push` limité à `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - Passage de CICD en v4.3.1 puis v4.3.2, avec les secrets du journal des releases et le suivi Renovate des références épinglées par SHA. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Après une action confirmée, un message de succès refermable s'affiche : `Message direct créé.`, `Groupe « <nom> » créé.` ou `Conversation « <nom> » supprimée.` Il disparaît au lancement d'une nouvelle action ou au changement de compte. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- L'interface adopte le thème partagé de `@mairie360/lib-components` (feuille de style commune et couleurs par variables `--mairie-*`, à la place du thème municipal local). Le chargement des conversations affiche un squelette. Une liste vide affiche « Aucune conversation » avec l'invite « Créez un message ou un groupe pour commencer. » ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- La création d'un message direct ou d'un groupe n'est acceptée que si la réponse du BFF la confirme : identifiants de la conversation et du message cohérents, nom de groupe non vide. Sinon, l'erreur `La création du message direct n’a pas été confirmée. Le brouillon est conservé.` ou `La création du groupe n’a pas été confirmée. Le brouillon est conservé.` s'affiche et le brouillon est gardé. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact :
  - Avant : chaque envoi appelait `POST /direct-messages` et ouvrait une nouvelle conversation, si bien que les fils avec un même contact s'empilaient.
  - Maintenant, s'il existe déjà une conversation directe avec ce contact (`kind: 'direct'` et son `contactId`) : le message y est publié via `POST /conversations/{id}/messages`, cette conversation s'ouvre et le message `Message envoyé dans la conversation existante.` s'affiche.
  - Seul un contact sans conversation directe passe encore par `POST /direct-messages`.
  - En cas de refus ou de réponse non confirmée, le brouillon est conservé et aucun autre fil n'est créé à la place. Les messages affichés sont `Le message n’a pas pu être envoyé.` ou `L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation.` (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances, sans changement de comportement annoncé :
  - Le socle partagé passe de l'archive `@mairie360/front-kit` à `@mairie360/lib-components` `0.10.2` (sous-chemins `next`, `guard`, `browser`, `shared`, `react`, `theme`), avec un test vérifiant le contenu du bundle client. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
  - Le contrat `@mairie360/bff-message-openapi` et les images des stacks de test sont successivement réalignés : `1.0.0`, puis `0.0.0-dev.9cb0aa6…`, puis `0.0.0-staging.815c732…`. La politique de version accepte désormais les paquets `0.0.0-staging.<sha40>`. (MAIR-569, MAIR-575, MAIR-600, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#279](https://github.com/mairie360/Messages_Web_Service/pull/279), [#281](https://github.com/mairie360/Messages_Web_Service/pull/281))
- CI (3 PR) :
  - Jeton du workflow en lecture seule par défaut et `push` limité à `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - Passage de CICD en v4.3.1 puis v4.3.2, avec les secrets du journal des releases et le suivi Renovate des références épinglées par SHA. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271), [#275](https://github.com/mairie360/Messages_Web_Service/pull/275))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 18:57 UTC | dev | — | `500ac41` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39478543240) |
| 2026-10-20 13:42 UTC | dev | — | `9856e2c` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39431943853) |
| 2026-10-20 12:23 UTC | dev | — | `fcb38f1` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39421323652) |
| 2026-10-19 22:13 UTC | dev | — | `65902bb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39332830353) |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
