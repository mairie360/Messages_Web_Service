# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "65902bb6d44c6324e6f75e610de7ccb56733b3b5", "prod": "d950efef13cf04bf526892c50bc7efb61a5529a3", "prod_tag": "v0.4.0", "staging": "d950efef13cf04bf526892c50bc7efb61a5529a3", "updated": {"dev": "2026-10-19 22:13 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `d950efe` | — |
| staging | — | `d950efe` | — |
| dev | — | `65902bb` | 2026-10-19 22:13 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Après une action confirmée, la messagerie affiche une notification de succès que l'agent peut fermer : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. ». Elle disparaît dès qu'une nouvelle action démarre ou que l'utilisateur change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Pendant le chargement des conversations, un espace réservé animé (`Skeleton`) s'affiche. Sans conversation sélectionnée, un état vide « Aucune conversation » s'affiche avec le texte « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- Le module Messages adopte le thème commun de `@mairie360/lib-components` (feuille `styles.css` partagée, couleurs passées en variables `--mairie-*`, suppression de `municipal-theme.css`). Le lien d'évitement partagé précède désormais la navigation répétée. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe doit maintenant être confirmée par la réponse du BFF : identifiants présents et cohérents, nom de groupe non vide. Sinon, le brouillon est conservé et un message s'affiche : « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact créait auparavant un nouveau fil à chaque envoi via `POST /direct-messages`, ce qui empilait les conversations avec le même contact. Désormais, s'il existe déjà une conversation directe avec ce contact (`kind: 'direct'` et son `contactId`) :
  - le message y est publié via `POST /conversations/{id}/messages` ;
  - cette conversation s'ouvre et le message « Message envoyé dans la conversation existante. » s'affiche ;
  - un contact sans conversation directe passe toujours par `POST /direct-messages`.
  Un envoi refusé ou non confirmé conserve le brouillon et ne crée jamais d'autre fil. Les messages affichés sont alors « Le message n’a pas pu être envoyé. » ou « L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation. ». (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances :
  - Le socle partagé passe de `@mairie360/front-kit` (archive dans `vendor/`) aux sous-chemins de `@mairie360/lib-components`, épinglé en `0.10.2`, sans changement de comportement. Un nouveau test `npm run test:bundle` vérifie en CI que le bundle client n'embarque que les entrées utilisées. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
  - Le contrat `@mairie360/bff-message-openapi` passe en `1.0.0`, et les images des stacks docker-compose passent en versions prod (`bff-message` 1.0.0, `core-api` 2.1.0, `message-api` 2.0.0, `database`/`liquibase-migrations` 3.2.0). Un rétroportage de `braces` est ajouté en dépendance de développement. (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- CI :
  - Le jeton du workflow est en lecture seule par défaut, avec des droits d'écriture limités au job `CICD`, et les pipelines ne tournent sur `push` que pour `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - Passage au workflow `mairie360/CICD` v4.3.1, qui ajoute l'étape de journal des releases. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Après une action confirmée, la messagerie affiche une notification de succès que l'agent peut fermer : « Message direct créé. », « Groupe « … » créé. », « Conversation « … » supprimée. ». Elle disparaît dès qu'une nouvelle action démarre ou que l'utilisateur change. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- Pendant le chargement des conversations, un espace réservé animé (`Skeleton`) s'affiche. Sans conversation sélectionnée, un état vide « Aucune conversation » s'affiche avec le texte « Créez un message ou un groupe pour commencer. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Changements de comportement
- Le module Messages adopte le thème commun de `@mairie360/lib-components` (feuille `styles.css` partagée, couleurs passées en variables `--mairie-*`, suppression de `municipal-theme.css`). Le lien d'évitement partagé précède désormais la navigation répétée. ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- La création d'un message direct ou d'un groupe doit maintenant être confirmée par la réponse du BFF : identifiants présents et cohérents, nom de groupe non vide. Sinon, le brouillon est conservé et un message s'affiche : « La création du message direct n’a pas été confirmée. Le brouillon est conservé. » ou « La création du groupe n’a pas été confirmée. Le brouillon est conservé. ». ([#267](https://github.com/mairie360/Messages_Web_Service/pull/267))

#### Corrections
- « Nouveau message » vers un contact créait auparavant un nouveau fil à chaque envoi via `POST /direct-messages`, ce qui empilait les conversations avec le même contact. Désormais, s'il existe déjà une conversation directe avec ce contact (`kind: 'direct'` et son `contactId`) :
  - le message y est publié via `POST /conversations/{id}/messages` ;
  - cette conversation s'ouvre et le message « Message envoyé dans la conversation existante. » s'affiche ;
  - un contact sans conversation directe passe toujours par `POST /direct-messages`.
  Un envoi refusé ou non confirmé conserve le brouillon et ne crée jamais d'autre fil. Les messages affichés sont alors « Le message n’a pas pu être envoyé. » ou « L’envoi reste à confirmer. Le brouillon est conservé ; réessayez pour vérifier la conversation. ». (MAIR-204, [#140](https://github.com/mairie360/Messages_Web_Service/pull/140))

#### Technique
- Dépendances :
  - Le socle partagé passe de `@mairie360/front-kit` (archive dans `vendor/`) aux sous-chemins de `@mairie360/lib-components`, épinglé en `0.10.2`, sans changement de comportement. Un nouveau test `npm run test:bundle` vérifie en CI que le bundle client n'embarque que les entrées utilisées. (MAIR-126, [#273](https://github.com/mairie360/Messages_Web_Service/pull/273), [#277](https://github.com/mairie360/Messages_Web_Service/pull/277))
  - Le contrat `@mairie360/bff-message-openapi` passe en `1.0.0`, et les images des stacks docker-compose passent en versions prod (`bff-message` 1.0.0, `core-api` 2.1.0, `message-api` 2.0.0, `database`/`liquibase-migrations` 3.2.0). Un rétroportage de `braces` est ajouté en dépendance de développement. (MAIR-569, [#269](https://github.com/mairie360/Messages_Web_Service/pull/269), [#267](https://github.com/mairie360/Messages_Web_Service/pull/267))
- CI :
  - Le jeton du workflow est en lecture seule par défaut, avec des droits d'écriture limités au job `CICD`, et les pipelines ne tournent sur `push` que pour `main`. (MAIR-436, [#264](https://github.com/mairie360/Messages_Web_Service/pull/264))
  - Passage au workflow `mairie360/CICD` v4.3.1, qui ajoute l'étape de journal des releases. (MAIR-571, [#271](https://github.com/mairie360/Messages_Web_Service/pull/271))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 22:13 UTC | dev | — | `65902bb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39332830353) |
| 2026-10-19 21:58 UTC | dev | — | `8c9f0a3` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39330952745) |
| 2026-10-19 20:07 UTC | dev | — | `d74d7fa` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39315980603) |
<!-- release-journal-history:end -->
