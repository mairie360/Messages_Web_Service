# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "3f53055f7c5ae32b034b30b587ffab1be363ccf4", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-11-04 22:13 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `3f53055` | 2026-11-04 22:13 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Changements de comportement
- Dialogues « Nouveau message » et « Créer un groupe » : les champs sont désormais ceux de la lib (SelectField, TextArea, TextField, recherche, Checkbox, boutons Annuler / Envoyer / Créer). La liste vide du fil utilise DataState. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Échec de déconnexion : le message d'erreur est affiché avec ErrorAlert, accompagné de RetryButton / Button. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- La navigation latérale et l'en-tête viennent de `@mairie360/lib-components/shell` : les copies locales (`desktop-navigation`, `accessible-shell`, préférence de barre latérale) sont supprimées. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Dialogue « Créer un groupe » (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213)) : avant, le focus clavier pouvait sortir du dialogue et Échap ne le fermait pas. Maintenant, Tab et Maj+Tab restent dans le dialogue, Échap le ferme et rend le focus au bouton qui l'a ouvert.

#### Technique
- Tests E2E Playwright des parcours (envoi d'un message direct, lecture, refus pour un utilisateur sans conversation), avec une stack `docker-compose-e2e.yml` ; la promotion prod exige désormais `e2e/*.spec.ts` et `e2e_test.sh` (MAIR-603, [#298](https://github.com/mairie360/Messages_Web_Service/pull/298)). Le contrat committé pointe vers le paquet dev du BFF Message, et les stacks de test utilisent `bff-message:dev-cdd75eb`.
- Gitleaks : politique `.gitleaks.toml` limitée aux empreintes SHA-256 du manifeste Zod, et test qui fige la politique (MAIR-743, [#315](https://github.com/mairie360/Messages_Web_Service/pull/315)).
- Backport Zod vendorisé, vérification d'intégrité lancée en postinstall, prebuild et pretest, et preuve de bundle par source maps en CI (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307)).
- Simulation RGPD d'usage en CI avant la prod et revue des logs et de la base, avec durcissement du script (MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311) et [#312](https://github.com/mairie360/Messages_Web_Service/pull/312)).
- Checklist RGPD sur les PR, en workflow `gdpr-pr.yml` (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226)).
- Stack d'accessibilité RGAA et moteur RGAA de CICD, à la place de ZAP (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221)).
- Montées de version de mairie360/CICD (v4.5.0, v4.13.0, v5.2.2, v5.5.0) par Renovate et par le suivi de ces versions (MAIR-771, [#309](https://github.com/mairie360/Messages_Web_Service/pull/309), [#302](https://github.com/mairie360/Messages_Web_Service/pull/302), [#299](https://github.com/mairie360/Messages_Web_Service/pull/299), [#313](https://github.com/mairie360/Messages_Web_Service/pull/313)).
- Node.js 24.22.1 et images Docker épinglées par digest ; `tests` n'est plus exclu du contexte de build (`.dockerignore`) ([#300](https://github.com/mairie360/Messages_Web_Service/pull/300)).
- Dépendances : Next.js 16.4.2, jsdom 30.1.3, playwright-core 1.64.1, follow-redirects 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249), [#304](https://github.com/mairie360/Messages_Web_Service/pull/304)).
- Tests de composants Vitest et découpage de l'arborescence des composants (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291)).

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Dialogues « Nouveau message » et « Créer un groupe » : les champs sont désormais ceux de la lib (SelectField, TextArea, TextField, recherche, Checkbox, boutons Annuler / Envoyer / Créer). La liste vide du fil utilise DataState. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Échec de déconnexion : le message d'erreur est affiché avec ErrorAlert, accompagné de RetryButton / Button. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- La navigation latérale et l'en-tête viennent de `@mairie360/lib-components/shell` : les copies locales (`desktop-navigation`, `accessible-shell`, préférence de barre latérale) sont supprimées. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Dialogue « Créer un groupe » (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213)) : avant, le focus clavier pouvait sortir du dialogue et Échap ne le fermait pas. Maintenant, Tab et Maj+Tab restent dans le dialogue, Échap le ferme et rend le focus au bouton qui l'a ouvert.

#### Technique
- Tests E2E Playwright des parcours (envoi d'un message direct, lecture, refus pour un utilisateur sans conversation), avec une stack `docker-compose-e2e.yml` ; la promotion prod exige désormais `e2e/*.spec.ts` et `e2e_test.sh` (MAIR-603, [#298](https://github.com/mairie360/Messages_Web_Service/pull/298)). Le contrat committé pointe vers le paquet dev du BFF Message, et les stacks de test utilisent `bff-message:dev-cdd75eb`.
- Gitleaks : politique `.gitleaks.toml` limitée aux empreintes SHA-256 du manifeste Zod, et test qui fige la politique (MAIR-743, [#315](https://github.com/mairie360/Messages_Web_Service/pull/315)).
- Backport Zod vendorisé, vérification d'intégrité lancée en postinstall, prebuild et pretest, et preuve de bundle par source maps en CI (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307)).
- Simulation RGPD d'usage en CI avant la prod et revue des logs et de la base, avec durcissement du script (MAIR-497, [#311](https://github.com/mairie360/Messages_Web_Service/pull/311) et [#312](https://github.com/mairie360/Messages_Web_Service/pull/312)).
- Checklist RGPD sur les PR, en workflow `gdpr-pr.yml` (MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226)).
- Stack d'accessibilité RGAA et moteur RGAA de CICD, à la place de ZAP (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221)).
- Montées de version de mairie360/CICD (v4.5.0, v4.13.0, v5.2.2, v5.5.0) par Renovate et par le suivi de ces versions (MAIR-771, [#309](https://github.com/mairie360/Messages_Web_Service/pull/309), [#302](https://github.com/mairie360/Messages_Web_Service/pull/302), [#299](https://github.com/mairie360/Messages_Web_Service/pull/299), [#313](https://github.com/mairie360/Messages_Web_Service/pull/313)).
- Node.js 24.22.1 et images Docker épinglées par digest ; `tests` n'est plus exclu du contexte de build (`.dockerignore`) ([#300](https://github.com/mairie360/Messages_Web_Service/pull/300)).
- Dépendances : Next.js 16.4.2, jsdom 30.1.3, playwright-core 1.64.1, follow-redirects 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#249](https://github.com/mairie360/Messages_Web_Service/pull/249), [#304](https://github.com/mairie360/Messages_Web_Service/pull/304)).
- Tests de composants Vitest et découpage de l'arborescence des composants (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
