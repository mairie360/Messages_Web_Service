# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "878eeeb8dae4216dfdf6bdd8a64a92d875cd32f6", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-11-03 14:59 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `878eeeb` | 2026-11-03 14:59 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Changements de comportement

- Les fenêtres « Nouveau message » et « Créer un groupe » utilisent désormais les composants partagés de la lib (`SelectField`, `TextArea`, `TextField`, champ de recherche, `Checkbox`, boutons Annuler / Envoyer / Créer). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- L'état vide du fil de messages s'affiche avec `DataState`, et l'échec de déconnexion avec `ErrorAlert` + `RetryButton` / `Button`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Le shell (barre latérale, barre du haut, pied de page) vient de `@mairie360/lib-components/shell` (`AccessibleShell`) : les copies locales `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimées. La lib passe de 0.10.2 à 1.0.3, changement annoncé comme rupture (`feat!`). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Technique

- Simulation d'usage RGPD avant prod : stack `docker-compose-gdpr-simulation.yml`, `gdpr-simulation.yaml`, `gdpr-journey.yaml` et `gdpr_simulation_test.sh`, non publiés ; ignorés par `.dockerignore` et `.gitignore`. (MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311))
- Checklist RGPD sur les pull requests (`gdpr-pr.yml`, avec un test de pin dans `renovate.json`). (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226))
- Correctif zod par backport vendorisé (`vendor/zod`), vérification d'intégrité au `postinstall` / `prebuild` / `pretest`, exclusion Gitleaks de `vendor/security-patches.json`, source maps émises seulement par le build de mesure du bundle. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- Mise à jour de la pin mairie360/CICD dans les workflows (v4.5.0, v4.13.0, v5.1.1, v5.2.2, v5.3.0) et du test `packaging-policy`. (MAIR-316, MAIR-771, [#299](https://github.com/mairie360/Messages_Web_Service/pull/299), [#302](https://github.com/mairie360/Messages_Web_Service/pull/302), [#309](https://github.com/mairie360/Messages_Web_Service/pull/309), [#311](https://github.com/mairie360/Messages_Web_Service/pull/311))
- Suite RGAA : `rgaa.yaml`, `docker-compose-accessibility.yml`, `init-accessibility.sql`, `accessibility_test.sh`. (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221))
- `follow-redirects` résolu en 1.16.2 dans le lock, avec un test de non-régression. (GHSA-mrwp-f3q8-3g9p, [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- Node 24.22.1 (images Docker par digest, CI, `development.Dockerfile`). Dans `.dockerignore`, `tests` n'est plus exclu : le dossier de tests entre désormais dans le contexte de build. (MAIR-600, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Dépendances mises à jour : Next.js 16.4.2, `eslint-config-next`, `jsdom` 30.1.3, `playwright-core` 1.64.1, `@types/node`, `@vitest/coverage-v8`, daisyui. (MAIR-600, [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- Test de non-régression du focus de la fenêtre « Créer un groupe » (Tab / Shift+Tab, Échap, retour du focus). (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))
- Arborescence des composants de messagerie découpée en dossiers et tests co-localisés, avec `tests/component-tree-convention.test.cjs` et Vitest dans `npm test`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement

- Les fenêtres « Nouveau message » et « Créer un groupe » utilisent désormais les composants partagés de la lib (`SelectField`, `TextArea`, `TextField`, champ de recherche, `Checkbox`, boutons Annuler / Envoyer / Créer). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- L'état vide du fil de messages s'affiche avec `DataState`, et l'échec de déconnexion avec `ErrorAlert` + `RetryButton` / `Button`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Le shell (barre latérale, barre du haut, pied de page) vient de `@mairie360/lib-components/shell` (`AccessibleShell`) : les copies locales `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimées. La lib passe de 0.10.2 à 1.0.3, changement annoncé comme rupture (`feat!`). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Technique

- Simulation d'usage RGPD avant prod : stack `docker-compose-gdpr-simulation.yml`, `gdpr-simulation.yaml`, `gdpr-journey.yaml` et `gdpr_simulation_test.sh`, non publiés ; ignorés par `.dockerignore` et `.gitignore`. (MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311))
- Checklist RGPD sur les pull requests (`gdpr-pr.yml`, avec un test de pin dans `renovate.json`). (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226))
- Correctif zod par backport vendorisé (`vendor/zod`), vérification d'intégrité au `postinstall` / `prebuild` / `pretest`, exclusion Gitleaks de `vendor/security-patches.json`, source maps émises seulement par le build de mesure du bundle. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- Mise à jour de la pin mairie360/CICD dans les workflows (v4.5.0, v4.13.0, v5.1.1, v5.2.2, v5.3.0) et du test `packaging-policy`. (MAIR-316, MAIR-771, [#299](https://github.com/mairie360/Messages_Web_Service/pull/299), [#302](https://github.com/mairie360/Messages_Web_Service/pull/302), [#309](https://github.com/mairie360/Messages_Web_Service/pull/309), [#311](https://github.com/mairie360/Messages_Web_Service/pull/311))
- Suite RGAA : `rgaa.yaml`, `docker-compose-accessibility.yml`, `init-accessibility.sql`, `accessibility_test.sh`. (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221))
- `follow-redirects` résolu en 1.16.2 dans le lock, avec un test de non-régression. (GHSA-mrwp-f3q8-3g9p, [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- Node 24.22.1 (images Docker par digest, CI, `development.Dockerfile`). Dans `.dockerignore`, `tests` n'est plus exclu : le dossier de tests entre désormais dans le contexte de build. (MAIR-600, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Dépendances mises à jour : Next.js 16.4.2, `eslint-config-next`, `jsdom` 30.1.3, `playwright-core` 1.64.1, `@types/node`, `@vitest/coverage-v8`, daisyui. (MAIR-600, [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- Test de non-régression du focus de la fenêtre « Créer un groupe » (Tab / Shift+Tab, Échap, retour du focus). (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))
- Arborescence des composants de messagerie découpée en dossiers et tests co-localisés, avec `tests/component-tree-convention.test.cjs` et Vitest dans `npm test`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-03 14:59 UTC | dev | — | `878eeeb` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41656798602) |
| 2026-11-02 23:06 UTC | dev | — | `64832f9` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41540164242) |
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
