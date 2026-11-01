# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "de2ab699c7136c6f7ec0794b1ac1b472875de895", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-10-23 13:29 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `de2ab69` | 2026-10-23 13:29 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Nouveautés
- Les dialogues « Nouveau message » et « Créer un groupe » utilisent désormais les composants de la lib (sélecteur de destinataire, zone de texte, champs texte, recherche, case à cocher, boutons Annuler, Envoyer et Créer). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Le fil vide affiche le composant `DataState` de la lib. L'échec de déconnexion affiche une `ErrorAlert` avec `RetryButton` et `Button`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Changements de comportement
- La coquille de l'application (barre latérale, navigation, préférence de barre latérale) vient maintenant de `@mairie360/lib-components/shell` (`AccessibleShell`). Les fichiers locaux `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimés. L'écran peut donc différer visuellement de la version précédente. (MAIR-578, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Les composants de messagerie (barre latérale, en-tête, bulles, composeur, dialogues) sont maintenant dans le dépôt, sous `src/components/MessagesPage/`, et ne viennent plus de `@mairie360/lib-components/messages`. La PR annonce un rendu HTML identique. (MAIR-607, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- `@mairie360/lib-components` passe de `0.10.2` à `1.0.3`. Le commit est marqué `feat!`, donc cassant pour la lib. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Technique
- Node passe de `24.21.0` à `24.22.1` dans les deux Dockerfile, dans les workflows CI et dans les images épinglées par digest. Next.js passe de `16.3.8` à `16.4.2`, avec `eslint-config-next`, `jsdom` et `playwright-core` mis à jour. Le `.dockerignore` n'exclut plus `tests`. (#300, #249, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300), [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- Les workflows CICD sont épinglés sur `mairie360/CICD` `v4.5.0` (Renovate, [#299](https://github.com/mairie360/Messages_Web_Service/pull/299)). Vitest, Testing Library, jest-axe sont ajoutés, `npm test` lance aussi `vitest`, et la couverture ignore les `*.test.tsx` ([#291](https://github.com/mairie360/Messages_Web_Service/pull/291)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Les dialogues « Nouveau message » et « Créer un groupe » utilisent désormais les composants de la lib (sélecteur de destinataire, zone de texte, champs texte, recherche, case à cocher, boutons Annuler, Envoyer et Créer). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Le fil vide affiche le composant `DataState` de la lib. L'échec de déconnexion affiche une `ErrorAlert` avec `RetryButton` et `Button`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Changements de comportement
- La coquille de l'application (barre latérale, navigation, préférence de barre latérale) vient maintenant de `@mairie360/lib-components/shell` (`AccessibleShell`). Les fichiers locaux `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimés. L'écran peut donc différer visuellement de la version précédente. (MAIR-578, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Les composants de messagerie (barre latérale, en-tête, bulles, composeur, dialogues) sont maintenant dans le dépôt, sous `src/components/MessagesPage/`, et ne viennent plus de `@mairie360/lib-components/messages`. La PR annonce un rendu HTML identique. (MAIR-607, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- `@mairie360/lib-components` passe de `0.10.2` à `1.0.3`. Le commit est marqué `feat!`, donc cassant pour la lib. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Technique
- Node passe de `24.21.0` à `24.22.1` dans les deux Dockerfile, dans les workflows CI et dans les images épinglées par digest. Next.js passe de `16.3.8` à `16.4.2`, avec `eslint-config-next`, `jsdom` et `playwright-core` mis à jour. Le `.dockerignore` n'exclut plus `tests`. (#300, #249, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300), [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- Les workflows CICD sont épinglés sur `mairie360/CICD` `v4.5.0` (Renovate, [#299](https://github.com/mairie360/Messages_Web_Service/pull/299)). Vitest, Testing Library, jest-axe sont ajoutés, `npm test` lance aussi `vitest`, et la couverture ignore les `*.test.tsx` ([#291](https://github.com/mairie360/Messages_Web_Service/pull/291)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-23 13:29 UTC | dev | — | `de2ab69` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39960587529) |
| 2026-10-21 11:08 UTC | prod | v0.5.0 | `9b14d68` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/39589357350) |
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
