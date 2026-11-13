# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "9dc5ed0d9f9e4ab81579c89ed986971eea5fda11", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "2fdf0c48002987685fa42952d4864cf521ab4a35", "updated": {"dev": "2026-11-13 01:06 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-11-12 19:05 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `2fdf0c4` | 2026-11-12 19:05 UTC |
| dev | — | `9dc5ed0` | 2026-11-13 01:06 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

- chore(deps): update mairie360 database schema to v3.4.0 (#321) ([#321](https://github.com/mairie360/Messages_Web_Service/pull/321))
- fix: MAIR-816 Release dev: align internal versions and deploy ([#320](https://github.com/mairie360/Messages_Web_Service/pull/320))
- chore(deps): update dependency mairie360/cicd to v5.6.0 (#318) ([#318](https://github.com/mairie360/Messages_Web_Service/pull/318))
- feat: MAIR-603 E2E - Parcours utilisateurs Playwright des fronts (#298) ([#298](https://github.com/mairie360/Messages_Web_Service/pull/298))
- chore(deps): update dependency mairie360/cicd to v5.5.0 (#313) ([#313](https://github.com/mairie360/Messages_Web_Service/pull/313))
- fix: MAIR-743 [Audit 30/10] Login, Calendars, Elearning, Projects: branch Gitleaks fingerprints invalid after squash, main likely red (N1) (#315) ([#315](https://github.com/mairie360/Messages_Web_Service/pull/315))
- fix: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#312](https://github.com/mairie360/Messages_Web_Service/pull/312))
- feat: MAIR-497 RGPD - Simulation d'usage et revue IA des logs et de la base avant la prod ([#311](https://github.com/mairie360/Messages_Web_Service/pull/311))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#309) ([#309](https://github.com/mairie360/Messages_Web_Service/pull/309))
- chore(deps): update mairie360 cicd (#302) ([#302](https://github.com/mairie360/Messages_Web_Service/pull/302))
- fix(security): MAIR-770 Administrator, Dashboard, Messages, Settings : porter le correctif zod et la preuve de bundle par source maps ([#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- fix(deps): bump follow-redirects to 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- feat: MAIR-316 RGAA - Périmètre et états des pages par front (#221) ([#221](https://github.com/mairie360/Messages_Web_Service/pull/221))
- fix(messages): MAIR-318 contain creation dialog keyboard focus (#213) ([#213](https://github.com/mairie360/Messages_Web_Service/pull/213))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#226) ([#226](https://github.com/mairie360/Messages_Web_Service/pull/226))
- fix(security): patch Node.js runtime and toolchain (#300) ([#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- chore(deps): update dependency mairie360/cicd to v4.5.0 (#299) ([#299](https://github.com/mairie360/Messages_Web_Service/pull/299))
- fix(deps): update typescript dependencies (#249) ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- feat!: MAIR-608 Lib UI - Normaliser la charte, les tailles et les composants partagés des fronts ([#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

## Différence dev → staging (en dev, pas encore en staging)

- chore(deps): update mairie360 database schema to v3.4.0 (#321) ([#321](https://github.com/mairie360/Messages_Web_Service/pull/321))

## Différence staging → prod (en staging, pas encore en prod)

- fix: MAIR-816 Release dev: align internal versions and deploy ([#320](https://github.com/mairie360/Messages_Web_Service/pull/320))
- chore(deps): update dependency mairie360/cicd to v5.6.0 (#318) ([#318](https://github.com/mairie360/Messages_Web_Service/pull/318))
- feat: MAIR-603 E2E - Parcours utilisateurs Playwright des fronts (#298) ([#298](https://github.com/mairie360/Messages_Web_Service/pull/298))
- chore(deps): update dependency mairie360/cicd to v5.5.0 (#313) ([#313](https://github.com/mairie360/Messages_Web_Service/pull/313))
- fix: MAIR-743 [Audit 30/10] Login, Calendars, Elearning, Projects: branch Gitleaks fingerprints invalid after squash, main likely red (N1) (#315) ([#315](https://github.com/mairie360/Messages_Web_Service/pull/315))
- fix: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#312](https://github.com/mairie360/Messages_Web_Service/pull/312))
- feat: MAIR-497 RGPD - Simulation d'usage et revue IA des logs et de la base avant la prod ([#311](https://github.com/mairie360/Messages_Web_Service/pull/311))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#309) ([#309](https://github.com/mairie360/Messages_Web_Service/pull/309))
- chore(deps): update mairie360 cicd (#302) ([#302](https://github.com/mairie360/Messages_Web_Service/pull/302))
- fix(security): MAIR-770 Administrator, Dashboard, Messages, Settings : porter le correctif zod et la preuve de bundle par source maps ([#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- fix(deps): bump follow-redirects to 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- feat: MAIR-316 RGAA - Périmètre et états des pages par front (#221) ([#221](https://github.com/mairie360/Messages_Web_Service/pull/221))
- fix(messages): MAIR-318 contain creation dialog keyboard focus (#213) ([#213](https://github.com/mairie360/Messages_Web_Service/pull/213))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#226) ([#226](https://github.com/mairie360/Messages_Web_Service/pull/226))
- fix(security): patch Node.js runtime and toolchain (#300) ([#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- chore(deps): update dependency mairie360/cicd to v4.5.0 (#299) ([#299](https://github.com/mairie360/Messages_Web_Service/pull/299))
- fix(deps): update typescript dependencies (#249) ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- feat!: MAIR-608 Lib UI - Normaliser la charte, les tailles et les composants partagés des fronts ([#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

> Résumé Claude indisponible pour ce passage : listes brutes des commits.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-13 01:06 UTC | dev | — | `9dc5ed0` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/43340627312) |
| 2026-11-12 19:05 UTC | staging | — | `2fdf0c4` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/43285882384) |
| 2026-11-12 17:05 UTC | dev | — | `2fdf0c4` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/43264148661) |
| 2026-11-04 22:13 UTC | dev | — | `3f53055` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41922196368) |
| 2026-11-04 21:57 UTC | dev | — | `85d5bed` | [run](https://github.com/mairie360/Messages_Web_Service/actions/runs/41919598542) |
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
