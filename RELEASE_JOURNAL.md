# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "85d5bed58159350f2bcbc1d0882774f0fb81c0fd", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-11-04 21:57 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `85d5bed` | 2026-11-04 21:57 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Changements de comportement
- La barre latérale vient désormais de `@mairie360/lib-components/shell` (`AccessibleShell`) : les fichiers locaux `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimés, et la préférence de la barre latérale passe par `configureSidebarCookieDomain` de la lib. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Les fenêtres Nouveau message et Créer un groupe sont recomposées sur les composants partagés de la lib (`SelectField`, `TextArea`, `TextField`, champ de recherche, `Checkbox`, boutons Annuler / Envoyer / Créer). L'état vide de la conversation utilise `DataState` et l'échec de déconnexion affiche `ErrorAlert` avec `RetryButton` (d'après la description de la PR, les composants existent dans le diff). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 (PR marquée `feat!`). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Redirections HTTP : `follow-redirects` (via axios) passe en 1.16.2. Avant : en 1.16.0 à 1.16.1, des identifiants personnalisés pouvaient être transmis lors de redirections inter-origines (GHSA-mrwp-f3q8-3g9p). Maintenant : version corrigée dans le lock. (sans ticket Jira, [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- Dépendance zod : avant, zod 3.25.76 était utilisé (GHSA-mrhx-c7xc-m3w5). Maintenant, le backport vendorisé `vendor/zod` (3.25.76+mairie360.1) est utilisé via `file:vendor/zod` et l'override `$zod`. Les scripts postinstall, prebuild et pretest vérifient ce backport hors ligne. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- Runtime Node : l'image et la CI passent de Node 24.21.0 à 24.22.1 (correctif de sécurité du 21 octobre 2026). (sans ticket Jira, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Focus clavier de Créer un groupe : un test est ajouté (Tab et Shift+Tab restent dans la fenêtre, Échap la ferme et rend le focus au bouton d'ouverture). La description annonce le correctif correspondant, mais le diff fourni ne contient que ce test : le code corrigé n'est pas vérifiable ici. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))

#### Technique
- CI : mairie360/CICD est mis à jour plusieurs fois (v4.4.3 vers v5.5.0), y compris par Renovate. Ajout du workflow `gdpr-pr.yml` qui vérifie la checklist RGPD des PR (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226)), et du script et de la stack de simulation RGPD (MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311), [#312](https://github.com/mairie360/Messages_Web_Service/pull/312)).
- Gitleaks : `.gitleaks.toml` n'ignore que les empreintes SHA-256 du manifeste zod (MAIR-743, [#315](https://github.com/mairie360/Messages_Web_Service/pull/315)). Des tests de politique sont ajoutés.
- Dépendances : Next 16.3.8 vers 16.4.2, eslint-config-next, jsdom 30.1.3 et playwright-core 1.64.1 ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249)). Le `.dockerignore` n'exclut plus `tests`.
- Tests : `npm test` lance aussi vitest (`test:components`) avec des tests co-localisés et des dépendances Testing Library (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291)).

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- La barre latérale vient désormais de `@mairie360/lib-components/shell` (`AccessibleShell`) : les fichiers locaux `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimés, et la préférence de la barre latérale passe par `configureSidebarCookieDomain` de la lib. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Les fenêtres Nouveau message et Créer un groupe sont recomposées sur les composants partagés de la lib (`SelectField`, `TextArea`, `TextField`, champ de recherche, `Checkbox`, boutons Annuler / Envoyer / Créer). L'état vide de la conversation utilise `DataState` et l'échec de déconnexion affiche `ErrorAlert` avec `RetryButton` (d'après la description de la PR, les composants existent dans le diff). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- `@mairie360/lib-components` passe de 0.10.2 à 1.0.3 (PR marquée `feat!`). (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Redirections HTTP : `follow-redirects` (via axios) passe en 1.16.2. Avant : en 1.16.0 à 1.16.1, des identifiants personnalisés pouvaient être transmis lors de redirections inter-origines (GHSA-mrwp-f3q8-3g9p). Maintenant : version corrigée dans le lock. (sans ticket Jira, [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- Dépendance zod : avant, zod 3.25.76 était utilisé (GHSA-mrhx-c7xc-m3w5). Maintenant, le backport vendorisé `vendor/zod` (3.25.76+mairie360.1) est utilisé via `file:vendor/zod` et l'override `$zod`. Les scripts postinstall, prebuild et pretest vérifient ce backport hors ligne. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- Runtime Node : l'image et la CI passent de Node 24.21.0 à 24.22.1 (correctif de sécurité du 21 octobre 2026). (sans ticket Jira, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Focus clavier de Créer un groupe : un test est ajouté (Tab et Shift+Tab restent dans la fenêtre, Échap la ferme et rend le focus au bouton d'ouverture). La description annonce le correctif correspondant, mais le diff fourni ne contient que ce test : le code corrigé n'est pas vérifiable ici. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))

#### Technique
- CI : mairie360/CICD est mis à jour plusieurs fois (v4.4.3 vers v5.5.0), y compris par Renovate. Ajout du workflow `gdpr-pr.yml` qui vérifie la checklist RGPD des PR (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226)), et du script et de la stack de simulation RGPD (MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311), [#312](https://github.com/mairie360/Messages_Web_Service/pull/312)).
- Gitleaks : `.gitleaks.toml` n'ignore que les empreintes SHA-256 du manifeste zod (MAIR-743, [#315](https://github.com/mairie360/Messages_Web_Service/pull/315)). Des tests de politique sont ajoutés.
- Dépendances : Next 16.3.8 vers 16.4.2, eslint-config-next, jsdom 30.1.3 et playwright-core 1.64.1 ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249)). Le `.dockerignore` n'exclut plus `tests`.
- Tests : `npm test` lance aussi vitest (`test:components`) avec des tests co-localisés et des dépendances Testing Library (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
