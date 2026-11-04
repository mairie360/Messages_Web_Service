# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "5393bd46b89db0c13a82c262bf42f2959db7201c", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-11-04 18:25 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `5393bd4` | 2026-11-04 18:25 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Nouveautés
- L'écran vide de la messagerie utilise désormais le composant `DataState` de la lib, et l'échec de déconnexion affiche un `ErrorAlert` avec `RetryButton` / `Button`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Changements de comportement
- Les dialogues « Nouveau message » et « Créer un groupe » utilisent les champs de la lib (`SelectField`, `TextArea`, `TextField`, champ de recherche, `Checkbox`, boutons Annuler / Envoyer / Créer). Le rendu HTML reste identique selon la PR. Les composants de messagerie viennent désormais de `src/components/MessagesPage/` au lieu de `@mairie360/lib-components/messages`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- La navigation (barre latérale, barre du haut, pied de page) vient de `AccessibleShell` de la lib. Les fichiers locaux `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimés. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Dialogue « Créer un groupe » : Tab et Shift+Tab restent dans le dialogue, Escape le ferme et rend le focus au bouton « Créer un groupe ». Avant, aucun test ne couvrait ce comportement sur ce dialogue, alors que « Nouveau message » en avait un. Le diff fourni ne contient que le test, pas l'implémentation. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))

#### Technique
- Dépendance `@mairie360/lib-components` passée à 1.0.3 ; tests composants ajoutés avec vitest et Testing Library, plus une vérification de l'arborescence des composants. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Node.js 24.22.1 dans les Dockerfiles (images figées par digest), la CI et `contracts.yml` ; le dossier `tests` n'est plus exclu de l'image Docker. (de2ab69, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Mises à jour de dépendances : Next.js et `eslint-config-next` en 16.4.2, `jsdom` en 30.1.3, `playwright-core` en 1.64.1. (Renovate, [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- `follow-redirects` en 1.16.2 (GHSA-mrwp-f3q8-3g9p), avec un test sur le lock. (MAIR-sans-ticket, [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- `zod` remplacé par le backport vendu 3.25.76+mairie360.1 (GHSA-mrhx-c7xc-m3w5), avec vérification d'intégrité en postinstall, prebuild et pretest. Les source maps ne sont produites que par le build CI de mesure. Le diff est tronqué, donc la vérification complète n'est pas visible. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- Pin de mairie360/CICD : v5.3.1 dans `cicd.yml`, les promotions et l'exception de dépendances ; v5.2.2 puis v5.3.1 dans `gdpr-pr.yml` ; les tests de pin sont mis à jour. (MAIR-771, [#309](https://github.com/mairie360/Messages_Web_Service/pull/309) ; [#312](https://github.com/mairie360/Messages_Web_Service/pull/312) ; renovate [#302](https://github.com/mairie360/Messages_Web_Service/pull/302))
- Workflow `gdpr-pr.yml` : contrôle RGPD sur chaque PR (section « Données personnelles » renseignée, inventaire si « Oui »). (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226))
- Outillage de test RGAA et simulation RGPD (`accessibility_test.sh`, `gdpr_simulation_test.sh`, leurs compose et fichiers YAML, entrées `.gitignore` / `.dockerignore`) ; aucun effet sur l'application. (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221) ; MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311), [#312](https://github.com/mairie360/Messages_Web_Service/pull/312))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- L'écran vide de la messagerie utilise désormais le composant `DataState` de la lib, et l'échec de déconnexion affiche un `ErrorAlert` avec `RetryButton` / `Button`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Changements de comportement
- Les dialogues « Nouveau message » et « Créer un groupe » utilisent les champs de la lib (`SelectField`, `TextArea`, `TextField`, champ de recherche, `Checkbox`, boutons Annuler / Envoyer / Créer). Le rendu HTML reste identique selon la PR. Les composants de messagerie viennent désormais de `src/components/MessagesPage/` au lieu de `@mairie360/lib-components/messages`. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- La navigation (barre latérale, barre du haut, pied de page) vient de `AccessibleShell` de la lib. Les fichiers locaux `accessible-shell.tsx`, `desktop-navigation.tsx` et `sidebar-preference.ts` sont supprimés. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Dialogue « Créer un groupe » : Tab et Shift+Tab restent dans le dialogue, Escape le ferme et rend le focus au bouton « Créer un groupe ». Avant, aucun test ne couvrait ce comportement sur ce dialogue, alors que « Nouveau message » en avait un. Le diff fourni ne contient que le test, pas l'implémentation. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))

#### Technique
- Dépendance `@mairie360/lib-components` passée à 1.0.3 ; tests composants ajoutés avec vitest et Testing Library, plus une vérification de l'arborescence des composants. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Node.js 24.22.1 dans les Dockerfiles (images figées par digest), la CI et `contracts.yml` ; le dossier `tests` n'est plus exclu de l'image Docker. (de2ab69, [#300](https://github.com/mairie360/Messages_Web_Service/pull/300))
- Mises à jour de dépendances : Next.js et `eslint-config-next` en 16.4.2, `jsdom` en 30.1.3, `playwright-core` en 1.64.1. (Renovate, [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))
- `follow-redirects` en 1.16.2 (GHSA-mrwp-f3q8-3g9p), avec un test sur le lock. (MAIR-sans-ticket, [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- `zod` remplacé par le backport vendu 3.25.76+mairie360.1 (GHSA-mrhx-c7xc-m3w5), avec vérification d'intégrité en postinstall, prebuild et pretest. Les source maps ne sont produites que par le build CI de mesure. Le diff est tronqué, donc la vérification complète n'est pas visible. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307))
- Pin de mairie360/CICD : v5.3.1 dans `cicd.yml`, les promotions et l'exception de dépendances ; v5.2.2 puis v5.3.1 dans `gdpr-pr.yml` ; les tests de pin sont mis à jour. (MAIR-771, [#309](https://github.com/mairie360/Messages_Web_Service/pull/309) ; [#312](https://github.com/mairie360/Messages_Web_Service/pull/312) ; renovate [#302](https://github.com/mairie360/Messages_Web_Service/pull/302))
- Workflow `gdpr-pr.yml` : contrôle RGPD sur chaque PR (section « Données personnelles » renseignée, inventaire si « Oui »). (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226))
- Outillage de test RGAA et simulation RGPD (`accessibility_test.sh`, `gdpr_simulation_test.sh`, leurs compose et fichiers YAML, entrées `.gitignore` / `.dockerignore`) ; aucun effet sur l'application. (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221) ; MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311), [#312](https://github.com/mairie360/Messages_Web_Service/pull/312))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
