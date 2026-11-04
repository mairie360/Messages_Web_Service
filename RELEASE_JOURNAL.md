# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "76ad652cf331bc42b845877320ad8c4c358946dc", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-11-04 18:39 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `76ad652` | 2026-11-04 18:39 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Changements de comportement
- L'interface passe à la shell et aux composants de `@mairie360/lib-components` 1.0.3 : la navigation latérale vient de `AccessibleShell` (`desktop-navigation.tsx`, `accessible-shell.tsx` et `sidebar-preference.ts` sont supprimés), les fenêtres « Nouveau message » et « Créer un groupe » utilisent les champs et boutons de la lib, le fil vide affiche `DataState`, et l'échec de déconnexion affiche `ErrorAlert` avec `RetryButton`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Technique
- Sécurité et build : le paquet `zod` passe au backport vendoré `vendor/zod` (3.25.76+mairie360.1) ; `postinstall`, `prebuild` et `pretest` vérifient l'intégrité hors ligne ; `.gitleaks.toml` ne tolère que les empreintes SHA-256 de `vendor/security-patches.json` ; les source maps ne sont émises que par le build de mesure CI. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307) ; MAIR-743, [#315](https://github.com/mairie360/Messages_Web_Service/pull/315))
- CI, conteneurs et dépendances : pins mairie360/CICD portés de v4.5.0 à v5.3.1, nouveau workflow `gdpr-pr.yml` (checklist RGPD des PR, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226)), scripts de simulation RGPD et stack `docker-compose-gdpr-simulation.yml` ([#311](https://github.com/mairie360/Messages_Web_Service/pull/311), [#312](https://github.com/mairie360/Messages_Web_Service/pull/312)), stack RGAA `accessibility_test.sh` ([#221](https://github.com/mairie360/Messages_Web_Service/pull/221)). Image Node 24.22.1 par digest, `.dockerignore` n'exclut plus `tests`, Next 16.4.2, `follow-redirects` 1.16.2 et mises à jour Renovate ([#300](https://github.com/mairie360/Messages_Web_Service/pull/300), [#304](https://github.com/mairie360/Messages_Web_Service/pull/304), [#249](https://github.com/mairie360/Messages_Web_Service/pull/249)). Le diff fourni de [#213](https://github.com/mairie360/Messages_Web_Service/pull/213) (MAIR-318) ne contient qu'un test du focus de la fenêtre « Créer un groupe » ; le code d'implémentation n'y figure pas.

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- L'interface passe à la shell et aux composants de `@mairie360/lib-components` 1.0.3 : la navigation latérale vient de `AccessibleShell` (`desktop-navigation.tsx`, `accessible-shell.tsx` et `sidebar-preference.ts` sont supprimés), les fenêtres « Nouveau message » et « Créer un groupe » utilisent les champs et boutons de la lib, le fil vide affiche `DataState`, et l'échec de déconnexion affiche `ErrorAlert` avec `RetryButton`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Technique
- Sécurité et build : le paquet `zod` passe au backport vendoré `vendor/zod` (3.25.76+mairie360.1) ; `postinstall`, `prebuild` et `pretest` vérifient l'intégrité hors ligne ; `.gitleaks.toml` ne tolère que les empreintes SHA-256 de `vendor/security-patches.json` ; les source maps ne sont émises que par le build de mesure CI. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307) ; MAIR-743, [#315](https://github.com/mairie360/Messages_Web_Service/pull/315))
- CI, conteneurs et dépendances : pins mairie360/CICD portés de v4.5.0 à v5.3.1, nouveau workflow `gdpr-pr.yml` (checklist RGPD des PR, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226)), scripts de simulation RGPD et stack `docker-compose-gdpr-simulation.yml` ([#311](https://github.com/mairie360/Messages_Web_Service/pull/311), [#312](https://github.com/mairie360/Messages_Web_Service/pull/312)), stack RGAA `accessibility_test.sh` ([#221](https://github.com/mairie360/Messages_Web_Service/pull/221)). Image Node 24.22.1 par digest, `.dockerignore` n'exclut plus `tests`, Next 16.4.2, `follow-redirects` 1.16.2 et mises à jour Renovate ([#300](https://github.com/mairie360/Messages_Web_Service/pull/300), [#304](https://github.com/mairie360/Messages_Web_Service/pull/304), [#249](https://github.com/mairie360/Messages_Web_Service/pull/249)). Le diff fourni de [#213](https://github.com/mairie360/Messages_Web_Service/pull/213) (MAIR-318) ne contient qu'un test du focus de la fenêtre « Créer un groupe » ; le code d'implémentation n'y figure pas.

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-04 18:39 UTC | dev | — | `76ad652` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41888012239) |
| 2026-11-04 18:25 UTC | dev | — | `5393bd4` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41882777976) |
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
