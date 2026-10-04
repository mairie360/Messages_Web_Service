# Messages_Web_Service

Provide the instant-messaging interface with conversations, contacts and links to business objects. Calls go through BFF Message.

Fournir l’interface de messagerie instantanée avec conversations, contacts et liens vers les objets métier. Les appels passent par BFF Message.

## Documentation

| Language / Langue | Module | Technical / Technique |
| --- | --- | --- |
| English | [Module overview](docs/en/module.md) | [Technical documentation](docs/en/technical.md) |
| Français | [Présentation du module](docs/fr/module.md) | [Documentation technique](docs/fr/technical.md) |

The guides describe the implemented module, its current limitations, local setup, routes, data, verification and CI/CD.

Les guides décrivent le module implémenté, ses limites actuelles, le démarrage local, les routes, les données, les vérifications et la CI/CD.

## Initial loading recovery / Reprise du chargement initial (MAIR-457, #207)

Initial loading and refusal are separate from a confirmed empty conversation list.
Messaging write controls appear only after the existing bootstrap completes. An
explicit Retry repeats that read without reloading, prevents overlapping commands,
and retains the existing deep-link and contact-fallback behavior. Disposed or older
responses are ignored logically: the unchanged client does not support transport
cancellation. No acknowledgement or write is performed by recovery.

L’attente et le refus initial ne sont pas présentés comme une liste vide confirmée.
Réessayer relance la lecture existante sans recharger la page ni envoyer d’écriture.
La commande indique l’attente et bloque les doublons ; les liens directs et le
repli des contacts restent conservés. Les réponses anciennes/après démontage sont
ignorées, sans prétendre annuler le transport. Tests et fixtures restent isolés ;
ils ne prouvent ni authentification ni persistance déployées. API/BFF, contrats,
clients, bibliothèque partagée et déploiements ne changent pas.

## Contracts and background / Contrats et compléments

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.

## Reference reception cadence (MAIR-212)

Conversation lists and the active thread refresh every two seconds while the
page is visible, matching the preserved local prototype. Focus and visibility
changes also trigger a refresh. A pending read or mutation skips the cycle;
there is no queue of concurrent requests. Cleanup removes the timer/listeners.
Failed reads keep known messages, and revision guards reject stale replies.

Only published conversation/message reads are used. Server unread counts stay
authoritative: this does not enable or simulate persistent read acknowledgement,
which remains blocked under MAIR-269. The fallback-thread complement PR #210 is
composed with this candidate; recovery, focus, sizing, packaging and UI-pin PRs
are included too. No API/BFF, client, proxy, contract or environment change.

Tracking: [MAIR-212](https://mairie-360.atlassian.net/browse/MAIR-212) and
[Messages #144](https://github.com/mairie360/Messages_Web_Service/issues/144).
Cadence, slow-read deduplication, unsent draft preservation, hidden-tab polling
and teardown are covered by real-page HTTP-contract-backed regressions.
Integration and exact-head CI remain required before declaring delivery.

## Image packaging / Packaging des images (MAIR-436, #205)

Production/development images and consumer CI use Node 24.21.0; official images
are pinned by digest. The existing `NODE_AUTH_TOKEN` is provided as the required
BuildKit secret `node_auth_token` only during `npm ci`. The committed `.npmrc` is
mounted read-only for that step: registry, release-age policy and lock stay
unchanged. All three Compose frontend builds use that secret, never a build
argument or runtime credential. Production retains non-root Node/curl, standalone
assets and port 5003; development retains `npm run dev`.

Les images production/développement et la CI utilisent Node 24.21.0, avec digest
officiel épinglé. Le jeton existant n’est disponible que pendant `npm ci` via le
secret BuildKit requis `node_auth_token`, avec politique npm montée en lecture
seule. Aucun autre service Compose, comportement métier, API/BFF, contrat,
dépendance ou droit n’est modifié. Le runtime reste non-root sur le port 5003.

The exact legacy required security status runs real blocking Semgrep/Gitleaks
using reviewed immutable shared actions; the reusable 4.0.2 audit stays enabled.
No protection, scan threshold or deployment gate is weakened. Global permissions,
push filtering and dependency criteria remain separate open MAIR-436 work.
Packaging tests do not prove a complete application image or deployed UI:
issue #205 remains open until applicable CI, integration, full image verification
and the exact compiled local snapshot are evidenced. Functional issues #176,
#149, #144 and #139 stay distinct; PR #140 is explicitly excluded.

## Conversation fallback recovery

A confirmed deletion of the selected conversation immediately reads the remaining
selected thread through the existing message operation. Visible synchronization
also reads the replacement thread in the same cycle when the active conversation
disappears, or when a first conversation arrives in a previously empty list.
It does not wait for another two-second interval to make that thread usable.

A refused replacement read retains any previously confirmed messages in the
remaining thread, reports the failure and permits recovery by selecting that
conversation again. A confirmed disappearance is not undone by a read refusal.
Responses for another ID, an earlier selection, or a read started before a
confirmed send/deletion cannot replace newer state. Unread counts remain those
supplied by the service; this recovery never acknowledges messages as read.

The page tests cover these paths using isolated HTTP fixtures and the published
DTOs. The known operation/model mismatch for thread responses is explicitly
recorded by the existing test harness, not hidden as deployed-service validation.
Persistent read acknowledgement remains outside this frontend correction and
blocked under MAIR-269; MAIR-212 / issue #144 must remain open for that acceptance.

## Messaging dialog keyboard focus (MAIR-318)

The Messages consumer supplies focus lifecycle for the published New message and
Create group dialogs: initial focus, Tab/Shift+Tab containment, Escape through
the existing enabled Close button, and return to the opener. Disabled, hidden,
inert and unrendered controls are excluded. Observers/listeners are cleaned up.
No library override, BFF/API, contract, client, proxy or authentication change is
required. The pending Close guard remains owned by the published component.

Tracking: [MAIR-318](https://mairie-360.atlassian.net/browse/MAIR-318),
[Messages #212](https://github.com/mairie360/Messages_Web_Service/issues/212).
The issue must remain open until exact-head CI, integration and a refreshed
local-main verification are complete. This is not global RGAA certification.

Validation: ten controller tests with DOM doubles, plus native production-build
QA at 1280x720 and 390x844 with the published UI 0.6.8. Both dialogs, contact
filtering/selection, draft editing, button validation, focus loops and Escape
return were exercised. The temporary HTTP fixture made GET requests only; real
POST pending/refusal/confirmation is not claimed. Unit tests cover the disabled
Close guard. Production configuration, dependencies and demo data are unchanged.

Separate known gap: the composer draft can follow the user from conversation A
to B. That recipient-isolation issue is not resolved by this focus change.

## Shared UI alignment / Alignement UI partagé — MAIR-180

This consumer pins the published `@mairie360/lib-components@0.6.10`, including
its exact download URL and SHA512 integrity. Only the shared UI entry changes
in the lockfile; all other dependencies and security policies are preserved.
Tracking: [MAIR-180](https://mairie-360.atlassian.net/browse/MAIR-180) and
[cross-frontend issue](https://github.com/mairie360/Login_Web_Service/issues/142).
Login stays standalone without header/sidebar/footer; authenticated module
shells and the existing Elearning confirmation/rating features are preserved.
No API/BFF, contract, runtime configuration, demo data or deployment approval change.

Le pin exact et l'intégrité du package publié sont alignés sur Elearning sans
le rétrograder. Les tests de release vérifient le manifeste, le lockfile et le
vrai package installé. Une validation isolée ne remplace pas la CI verte,
l'intégration des sept consommateurs et la recette de la copie locale livrée.

## Composed frontend acceptance

Existing PRs206/208/209/210/211/213 are composed into the cadence candidate214.
Cleanup keeps bootstrap lifecycle generation and selection invalidation; the
focus observer stays on the persistent module root while Messaging is withheld
during initial loading. Cross-flow HTTP-backed page tests cover refused bootstrap
then first-thread arrival at two seconds, and deletion/selection pending that
blocks poll ticks before immediate fallback and resumed official reception.
No acknowledgement, new business protocol or reference fixture ships. Historical
isolated proofs are not a new composed visual or deployment certification.
Only successful applicable actual-head CI allows integration; issues and Jira
remain open until their own remaining criteria and exact main/local validation.

### Composed mobile verification — 4 October 2026

The exact composed source at 0ae9f0c was exercised with the published UI 0.6.10
in a genuinely measured **390×844** integrated-browser viewport (document390).
Initial refusal stays distinct from empty data; keyboard Retry announces pending
and reveals only the received conversations after confirmation. On mobile, the
full-height pane switch keeps the unsent draft. Both New message and Create group
dialogs opened after recovery enter Close, wrap Shift+Tab/Tab, close through Escape
and restore their own opener. The mobile navigation drawer also contains focus
and returns it to its trigger. There is no document overflow or framework overlay.

After confirmed disappearance of the selected conversation, the candidate selects
the remaining thread immediately and exposes a read refusal without restoring the
removed conversation. Keyboard reselection after recovery shows the official
thread; a confirmed empty list removes the selection/composer. The service's unread
count remains three, never simulated as zero. The draft moving from one recipient
to another is reproduced, **not fixed**: library #407 remains separate and no send
was attempted. Native send/upload/delete/group-submit pending acceptance is not
inferred from these GET-only interactions.

Two distinct fixture sessions recorded 15 GET and 198 GET, no writes or read
acknowledgement, maximum concurrent list reads one. The first session ended when
its server stopped; its later synchronization error is not a successful fault
recipe. The second completed 136 list cycles: ordinary intervals1995–2003ms,
one restart transition1910ms and one deliberately slow read producing5999ms between
starts. Its final confirmed-empty UI and console were checked before shutdown.
Both ledgers have no HTTP/DTO violations **under the existing explicit published
thread-operation/model exception and declared disposable503 replies**, not strict
operation-schema or deployed authentication/persistence certification.

81 real-page/focus/scroll regressions were rerun successfully. The older209-test
and desktop build evidence retains its original revision; this new recipe does
not certify all widths, all routes/RGAA or live authorization. The first screenshot
taken immediately after resizing still has desktop capture dimensions and is not
mobile proof; subsequent pending/dialog/refusal/recovery/empty captures are390×844.
The first reference source's two-second timer, visibility and revision guards were
re-read unchanged. Its simulated acknowledgement/zero-count behavior is not copied;
fresh paired old-source native comparison remains separate from this candidate-only
recipe. No API/BFF, client/proxy/contract/auth, library source, dependency, policy,
demo data, deployment approval or cluster pin changes. Own servers are stopped.

La recette du candidat composé est désormais observée en **vrai390×844** : reprise
du bootstrap au clavier, bascule des panneaux/brouillon, deux dialogues et tiroir
au clavier, disparition confirmée/reprise du fil puis liste vide. Les deux sessions
15GET/198GET sont distinctes et sans écriture ; les exceptions de contrat restent
explicites. Le brouillon passant d'un destinataire à l'autre reste le défaut407,
aucun envoi réalisé. La première capture redimensionnée et l'erreur après arrêt
ne valent pas preuve mobile/réussite. L'ancien code conserve sa cadence2s ; pas de
nouvelle comparaison native appariée ni persistance simulée copiée. CI réellement
verte, intégration main et recette exacte de local-current restent requises avant
clôture ; aucune API/BFF ou donnée de démonstration publiée.
