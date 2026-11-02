# Journal des releases — Messages_Web_Service

<!-- release-journal-state {"dev": "d17660ffbc7a1df3876feba8f46b23a3bf10063c", "prod": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "prod_tag": "v0.5.0", "staging": "9b14d687f47bbd09f93d7b2cfbbefc090e198a2f", "updated": {"dev": "2026-11-02 16:16 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 11:04 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `9b14d68` | 2026-10-21 11:08 UTC |
| staging | — | `9b14d68` | 2026-10-21 11:04 UTC |
| dev | — | `d17660f` | 2026-11-02 16:16 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

#### Changements de comportement
- Fenêtres « Nouveau message » et « Créer un groupe » : champs, sélecteurs et boutons (Annuler, Envoyer, Créer) sont désormais les composants partagés de la lib (SelectField, TextField, TextArea, Checkbox, Button), conformément à la maquette Figma. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Shell de l'application (barre latérale, barre supérieure, pied de page) : il vient désormais de `AccessibleShell` de `@mairie360/lib-components/shell`, avec la préférence de barre latérale gérée par la lib. Les copies locales `accessible-shell`, `desktop-navigation` et `sidebar-preference` sont supprimées. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Fil de discussion vide : affiche le composant `DataState` de la lib. Échec de déconnexion : affiche `ErrorAlert` avec `RetryButton`. Ces deux points viennent de la description de la PR et ne sont pas visibles dans le diff tronqué. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Fenêtre « Créer un groupe » : avant, le focus clavier pouvait sortir de la fenêtre. Désormais Tab et Maj+Tab restent dans la fenêtre, Échap la ferme (même effet que le bouton Fermer) et le focus revient au bouton « Créer un groupe » de la barre latérale. D'après la PR et le test de non-régression ajouté ; l'implémentation n'apparaît pas dans le diff fourni, seul le test l'est. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))

#### Technique
- Sécurité des dépendances : `zod` remplacé par le backport vendorisé 3.25.76+mairie360.1 (`file:vendor/zod`), contrôle d'intégrité hors ligne en postinstall, prebuild et pretest, provenance du bundle par source maps uniquement dans le build de mesure CI, et `follow-redirects` passé en 1.16.2. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307) ; [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- Outillage : Node 24.22.1 (Dockerfiles avec digest officiel, CI), `.dockerignore` n'exclut plus `tests`, CICD épinglé en v5.1.1, nouvelle pile d'accessibilité RGAA (`docker-compose-accessibility.yml`, `accessibility_test.sh`, `rgaa.yaml`), workflow GDPR des PR, mises à jour Renovate (CICD v4.5.0, Next 16.4.2, jsdom, playwright-core). (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221) ; MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226) ; [#300](https://github.com/mairie360/Messages_Web_Service/pull/300) ; [#299](https://github.com/mairie360/Messages_Web_Service/pull/299) ; [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Fenêtres « Nouveau message » et « Créer un groupe » : champs, sélecteurs et boutons (Annuler, Envoyer, Créer) sont désormais les composants partagés de la lib (SelectField, TextField, TextArea, Checkbox, Button), conformément à la maquette Figma. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Shell de l'application (barre latérale, barre supérieure, pied de page) : il vient désormais de `AccessibleShell` de `@mairie360/lib-components/shell`, avec la préférence de barre latérale gérée par la lib. Les copies locales `accessible-shell`, `desktop-navigation` et `sidebar-preference` sont supprimées. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))
- Fil de discussion vide : affiche le composant `DataState` de la lib. Échec de déconnexion : affiche `ErrorAlert` avec `RetryButton`. Ces deux points viennent de la description de la PR et ne sont pas visibles dans le diff tronqué. (MAIR-608, [#291](https://github.com/mairie360/Messages_Web_Service/pull/291))

#### Corrections
- Fenêtre « Créer un groupe » : avant, le focus clavier pouvait sortir de la fenêtre. Désormais Tab et Maj+Tab restent dans la fenêtre, Échap la ferme (même effet que le bouton Fermer) et le focus revient au bouton « Créer un groupe » de la barre latérale. D'après la PR et le test de non-régression ajouté ; l'implémentation n'apparaît pas dans le diff fourni, seul le test l'est. (MAIR-318, [#213](https://github.com/mairie360/Messages_Web_Service/pull/213))

#### Technique
- Sécurité des dépendances : `zod` remplacé par le backport vendorisé 3.25.76+mairie360.1 (`file:vendor/zod`), contrôle d'intégrité hors ligne en postinstall, prebuild et pretest, provenance du bundle par source maps uniquement dans le build de mesure CI, et `follow-redirects` passé en 1.16.2. (MAIR-770, [#307](https://github.com/mairie360/Messages_Web_Service/pull/307) ; [#304](https://github.com/mairie360/Messages_Web_Service/pull/304))
- Outillage : Node 24.22.1 (Dockerfiles avec digest officiel, CI), `.dockerignore` n'exclut plus `tests`, CICD épinglé en v5.1.1, nouvelle pile d'accessibilité RGAA (`docker-compose-accessibility.yml`, `accessibility_test.sh`, `rgaa.yaml`), workflow GDPR des PR, mises à jour Renovate (CICD v4.5.0, Next 16.4.2, jsdom, playwright-core). (MAIR-316, [#221](https://github.com/mairie360/Messages_Web_Service/pull/221) ; MAIR-295, [#226](https://github.com/mairie360/Messages_Web_Service/pull/226) ; [#300](https://github.com/mairie360/Messages_Web_Service/pull/300) ; [#299](https://github.com/mairie360/Messages_Web_Service/pull/299) ; [#249](https://github.com/mairie360/Messages_Web_Service/pull/249))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
