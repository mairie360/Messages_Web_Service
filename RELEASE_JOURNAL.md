# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "f94897d9f585508f7552f2cd5644fd198dc80624", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-11-02 22:22 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `f94897d` | 2026-11-02 22:22 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Changements de comportement
- La barre latérale, la barre supérieure et le pied de page viennent désormais de `AccessibleShell` (`@mairie360/lib-components/shell`) : `AppShell` ne fait plus que lier la session et la déconnexion. Les fichiers locaux `desktop-navigation`, `accessible-shell` et `sidebar-preference` sont supprimés. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Les fenêtres « Nouveau message » et « Créer un groupe » utilisent les composants de la lib (sélecteur, zone de texte, champ de recherche, cases à cocher, boutons Annuler, Envoyer, Créer). L'écran vide utilise `DataState` et l'échec de déconnexion affiche `ErrorAlert` avec `RetryButton`, d'après la description de la PR. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Fenêtre « Créer un groupe » : avant, le focus n'était pas contenu dans la fenêtre. Maintenant, Tab et Maj+Tab bouclent sur les éléments activés, Échap ferme la fenêtre comme le bouton Fermer, et le focus revient au déclencheur de la barre latérale. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213)) Le diff fourni ne contient que le test de non-régression de ce comportement ; le code décrit par la PR n'y figure pas, à vérifier avant de conclure.

#### Technique
- CI : `mairie360/CICD` passe de v4.4.3 à v4.5.0, puis à v5.2.2 pour les workflows front, et `gdpr-pr.yml` ajoute le check « GDPR checklist » sur chaque PR, à rendre obligatoire dans la protection de branche. (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226), [#299](https://github.com/mairie360/Messages_Web_Service/pull/299), [#302](https://github.com/mairie360/Messages_Web_Service/pull/302))
- Runtime : Node 24.22.1 dans les Dockerfile, la CI et le contrat, avec image de base épinglée par digest. `tests` n'est plus exclu du contexte Docker. (de2ab69, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Dépendances : Next.js 16.4.2, eslint-config-next, jsdom 30.1.3, playwright-core 1.64.1 ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249)). `follow-redirects` 1.16.2 dans le lock, avec test ([#304](https://github.com/mairie360/Messages_Web_Service/pull/304)). `zod` remplacé par un backport vendored, vérifié à `postinstall`, `prebuild` et `pretest`, avec source maps de bundle émises seulement par la mesure CI ([#307](https://github.com/mairie360/Messages_Web_Service/pull/307)).
- Lib : `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 dans `package.json`, alors que la PR parle de 1.0.1. Les composants de messagerie sont déplacés sous `src/components/MessagesPage/`, avec tests vitest co-localisés et contrôle de l'arborescence.
- RGAA (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221)) : stack d'accessibilité (`docker-compose-accessibility.yml`, `accessibility_test.sh`, `rgaa.yaml`, `init-accessibility.sql`) et secret `ANTHROPIC_WORKSPACE_ID` dans `promote-prod.yml`. Rien ne change dans l'application.

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- La barre latérale, la barre supérieure et le pied de page viennent désormais de `AccessibleShell` (`@mairie360/lib-components/shell`) : `AppShell` ne fait plus que lier la session et la déconnexion. Les fichiers locaux `desktop-navigation`, `accessible-shell` et `sidebar-preference` sont supprimés. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Les fenêtres « Nouveau message » et « Créer un groupe » utilisent les composants de la lib (sélecteur, zone de texte, champ de recherche, cases à cocher, boutons Annuler, Envoyer, Créer). L'écran vide utilise `DataState` et l'échec de déconnexion affiche `ErrorAlert` avec `RetryButton`, d'après la description de la PR. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Fenêtre « Créer un groupe » : avant, le focus n'était pas contenu dans la fenêtre. Maintenant, Tab et Maj+Tab bouclent sur les éléments activés, Échap ferme la fenêtre comme le bouton Fermer, et le focus revient au déclencheur de la barre latérale. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213)) Le diff fourni ne contient que le test de non-régression de ce comportement ; le code décrit par la PR n'y figure pas, à vérifier avant de conclure.

#### Technique
- CI : `mairie360/CICD` passe de v4.4.3 à v4.5.0, puis à v5.2.2 pour les workflows front, et `gdpr-pr.yml` ajoute le check « GDPR checklist » sur chaque PR, à rendre obligatoire dans la protection de branche. (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226), [#299](https://github.com/mairie360/Messages_Web_Service/pull/299), [#302](https://github.com/mairie360/Messages_Web_Service/pull/302))
- Runtime : Node 24.22.1 dans les Dockerfile, la CI et le contrat, avec image de base épinglée par digest. `tests` n'est plus exclu du contexte Docker. (de2ab69, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Dépendances : Next.js 16.4.2, eslint-config-next, jsdom 30.1.3, playwright-core 1.64.1 ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249)). `follow-redirects` 1.16.2 dans le lock, avec test ([#304](https://github.com/mairie360/Messages_Web_Service/pull/304)). `zod` remplacé par un backport vendored, vérifié à `postinstall`, `prebuild` et `pretest`, avec source maps de bundle émises seulement par la mesure CI ([#307](https://github.com/mairie360/Messages_Web_Service/pull/307)).
- Lib : `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 dans `package.json`, alors que la PR parle de 1.0.1. Les composants de messagerie sont déplacés sous `src/components/MessagesPage/`, avec tests vitest co-localisés et contrôle de l'arborescence.
- RGAA (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221)) : stack d'accessibilité (`docker-compose-accessibility.yml`, `accessibility_test.sh`, `rgaa.yaml`, `init-accessibility.sql`) et secret `ANTHROPIC_WORKSPACE_ID` dans `promote-prod.yml`. Rien ne change dans l'application.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-02 22:22 UTC | dev | — | `f94897d` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41533106634) |
| 2026-11-02 16:16 UTC | dev | — | `d17660f` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41478344880) |
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
