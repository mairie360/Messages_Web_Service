# Messages_Web_Service — Module overview

## Active-module navigation

Desktop and mobile menus omit the archived E-mails and Files modules, matching
the local presentation. The remaining module order and administrator visibility
are unchanged; Settings remains available through the shared AppShell.
Attachments and business documents inside active modules are not removed.

## One account destination

Profile access now opens **Settings**. Existing `/profile` bookmarks and subpaths
redirect to the configured Settings frontend for authenticated visitors. The
sidebar keeps Settings without a duplicate Profile entry. If Settings is not
configured correctly, those bookmarks return an uncached 503; no demo identity
or simulated save is shown.

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Provide the instant-messaging interface with conversations, contacts and links to business objects. Calls go through BFF Message.

## Audience and value

Staff exchanging messages with colleagues or work groups.

Business domain: Instant messaging.

## Available capabilities

Default presentation uses the local reference's 17px root size and system font.
The font rule takes precedence over the library's body default independently
of production CSS chunk ordering.
The shared header scales with its existing rem sizing; small-text tokens are not
overridden. Conversations and messages retain independent scroll areas on desktop.
On narrower screens, the conversation-list toggle keeps one full-height pane
visible at a time and preserves the unsent draft when switching panes.

The message panel uses the reference's full available width without a desktop
maximum-width cap. Outer spacing is 20px from 768px upward and 10px below that
breakpoint; the panel keeps the reference two-layer card shadow. The stack does
not clip that outer shadow; viewport and message-content clipping remain in
their own containers. From 1024px the conversation column is 300px, as in the
reference. Below that width the full-height pane switch is retained. These frontend
styles preserve bounded scrolling, pane switching and always reachable composer
controls; they do not add simulated notifications, identity or business data.

- Conversation list, active messages and contact search, with refresh while the tab is visible.
- Direct messages, conversation replies, group creation and deletion.

Initial pending or refused bootstrap is not an empty conversation list. Write
controls become available only after confirmation; an explicit, single-flight
Retry preserves an allowed deep link and bootstrap contacts when the contacts
read is refused. New message/group controls become available after recovery.

New message to a contact (MAIR-204): when a direct conversation with that contact
already exists (`kind: 'direct'` with the contact's `contactId`), the message is
posted into it (`POST /conversations/{id}/messages`) and that conversation opens;
only a contact without one gets a new chat from `POST /direct-messages`. A refused
send keeps the draft and never falls back to creating another chat.
The dedicated dialog-focus correction (MAIR-318, #212) is postponed with RGAA;
it is not included in this functional-only composition.

A confirmed deletion or disappearance immediately reads the replacement thread,
including the first arrival in an empty list. Visible reception runs every two
seconds, skipping pending reads, selection and mutations. Confirmed unread counts
stay authoritative; stale replies cannot overwrite newer selections or writes.
Refused reads retain known data and expose recovery, not simulated success.

An unseen thread is not treated as empty while its messages are loading or refused.
The requested conversation is named in the pending/unavailable status, with its
composer disabled until a matching successful read. Confirmed empty responses
retain the ordinary empty-message label and enable writing. Already known history
and unsent drafts remain mounted through refresh failures; this does not isolate
per-conversation drafts or persist them across navigation. A captured callback
cannot send to an older or unconfirmed selection. Retry uses the existing thread
selection or the next allowed refresh, without replaying a write.

Selecting a thread after session expiry starts the existing protected-page
navigation immediately, without waiting for reception polling. A genuine 401
clears the rejected cookie through the existing local logout; an opaque redirect
reloads without inventing a destination. Refusals 403/503 do not log out. This
does not replay a send or promise durable draft recovery after authentication.

Opening a `?conversation=` deep link uses the same session recovery before
mounting an unrelated bootstrap thread. A visible, current 401 or opaque redirect
recovers immediately; hidden or disposed responses cannot navigate. A 403/503
keeps the actual bootstrap and reports the inaccessible target without logging out.

Deletion keeps the known conversation and messages until the published response
confirms `deleted: true`. If an ID is returned, it must match the requested
conversation. A missing/invalid acknowledgement or refusal displays an error
and leaves retry available. Only one deletion may be pending; a visible status
replaces the delete action until completion. A different thread selected while
deleting remains selected and may finish loading after the deletion completes.
This frontend guard does not add server persistence or change the BFF contract.

Group creation keeps its name, optional description and selected members until
the service confirms success. While pending, form and close controls are disabled
to prevent duplicate creation. A refusal preserves the form for retry and displays
an error; only the server-created conversation is added to the list.
- Conversation and message timestamps displayed in French (day/month and hour:minute), using the browser timezone. Missing or unrecognized values are preserved without invented dates; message content is unchanged.
- Load project, task and event references, refreshing suggestions when returning to the visible tab. Temporary failures retain the last successful list; an access refusal clears it.

Attachments are not available yet (MAIR-512): the BFF answers 503 to the upload
and refuses any attachment id. The shared composer still shows "Joindre un fichier",
but a draft carrying files is refused locally in French before any network call;
sending the same text without its files works. Mentions offer contacts and group
conversations; only user mentions are transmitted to the BFF, group mentions stay
highlighted in the text. A BFF refusal of a send, a direct message or a group
creation is explained in French per refused field (markup `<` `>`, length,
unknown recipient or member); other refusals keep the BFF message.

## Typical workflow

### Polling session recovery — MAIR-409 / issue #215

Synchronization reads use manual redirects. An opaque browser redirect reopens
the same protected page; the existing guard determines Login and the return path.
A 401 uses the existing frontend logout-and-reload flow once, avoiding repeated
polls with a rejected but apparently unexpired cookie. A 403, network failure or
503 keeps known messages and the draft, allowing later reads to recover. Obsolete
or hidden responses do not start navigation. No API/BFF, middleware, proxy or
authentication route is changed; server-side revocation is not provided by this
consumer fix. Unsent drafts are not durable across a full page navigation.

The candidate has native desktop before/after evidence with the unchanged guard
and logout handler, a disposable cookie and a labelled QA Login landing. The
deployed Login/authentication flow is not certified. The attempted 390×844
override remained actually 1280×720, so this session slice has no mobile proof.
Integration and applicable green CI remain required before issue #215 is closed.

1. Load `/messaging/bootstrap` and select a conversation.
2. Find a contact or business reference, then send a message.
3. Inspect messages returned by the BFF; the list and active thread sync when the tab resumes and every two seconds while it stays visible.

## Role within Mairie360

Associated repositories: [BFF_Message](https://github.com/mairie360/BFF_Message).

This repository contains the browser interface and its Next.js adapters. The associated BFF supplies business data and coordinates its sources.

## Data and current state

Conversations and messages use Message API. Contacts are read directly from the SQL `users` table, including the current user (token `sub` identifier). Business references are aggregated from BFF Project and BFF Calendar. Local profile edits, attachment metadata and the read acknowledgement do not provide complete persistence.

## Scope and limitations

The Messages consumer restores the preserved reference sidebar shadow and 44px
minimum navigation-button height using scoped CSS, without copying navigation
or changing the published AppShell. Inside the mobile drawer, the sidebar stays
below its published Close button instead of inheriting the desktop stacking level.
The mobile full-height list/thread switch
intentionally adds a 48px control row instead of restoring the old stacked list.
Reference-source QA uses the available Next16/UI runtime, not a certification of
the original installation. Fake version, identity and notification data are not
restored. Header-shadow layering and global shell parity remain separate checks.

The 4 October 390×844 native evidence belongs to the historical mixed candidate,
including its dialog-focus correction; it does not certify this functional-only
composition. See README for revision-specific checks and limits. Recipient draft
isolation remains the separate library #407 defect, reproduced without sending.
GET-only recipes do not certify writes, deployed persistence or authorization.

The installed 0.4.0 contract and isolated fixtures do not prove durable binary
storage, persistent read acknowledgement or deployed permissions. Current upstream
read acknowledgement is refused; the frontend does not call it or invent a zero
counter. Downloads/business links (#176), persistent acknowledgement (#149/#144)
and composer-recipient draft isolation (lib-components #407) remain separate open
acceptance. Local candidate tests do not prove green applicable CI, integration
into main, exact refreshed local delivery, full-route RGAA or a complete image.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
### Send confirmation — MAIR-370

An incomplete or unrelated successful receipt retains the draft and previews. The next activation reads the thread instead of repeating the send or upload. Only the original server message ID in the requested thread confirms that send. A changed draft remains available and requires another explicit activation to send. A missing receipt ID remains unconfirmed and needs investigation of the service response. Drafts are not durable across reloads.


## Shared visual direction — MAIR-547

Approved light option 1: shared tokens and font, accessible navigation, and preserved business layouts. See the [visual QA](../qa/design-qa.md) for evidence, checks, and RGAA limitations.

## V2 screen (epic MAIR-821)

Messaging follows the agreed V2 mockup ([Figma, journeys F1–F9](https://www.figma.com/design/aZKHSHhAj0NQnutKdS82jk/?node-id=18-902)) on `@mairie360/lib-components` 2.

- **Frame (MAIR-838).** Lib 2: the collapsible navigation band, top bar, typography and the
  full-height main area (`mainLayout="fill"`: no page scroll, 20 px / 24 px padding) come from the lib
  frame; `app-shell.css` keeps only the messaging module geometry. The theme is always light.
- **Shell (MAIR-844).** The navigation band shows the lib logo and the commune name (`COMMUNE_NAME`),
  « Messagerie » is active with the unread total as its badge (« 9+ » beyond 9 since MAIR-1156), and the footer shows the
  version (`APP_VERSION`) and the legal notice / privacy policy pages of the Login front.
- **Start states (MAIR-847).** Loading and unavailable messaging use the lib `Card`, `ErrorAlert`
  (the refused start), `Skeleton` and `RetryButton` (« Chargement en cours… », disabled while loading).
- **Errors and statuses (MAIR-854).** A refused action is a closable lib `ErrorAlert`, a refused
  synchronisation a lasting one (the next read clears it); « Suppression de la conversation en cours… » and
  the thread opening text are info `Alert`s. Texts and `alert` / `status` announcements are unchanged.
- **Reception (MAIR-860).** The automatic reception state is a lib `StatusPill` (active: success,
  refreshing: info, connecting: neutral, delayed: warning); « Réessayer la réception » is a lib `Button`
  (44 px target) shown only while delayed.
- **Confirmations (MAIR-865).** « Message direct créé. », « Groupe … créé. » and the other action
  confirmations float in a lib toast bottom right, above the footer, without moving the module (5 s, no
  title, closable with the mouse or the keyboard).
- **Empty states (MAIR-870).** « Sélectionnez une conversation » (empty header, large semibold), « Aucune
  conversation trouvée. » (local search without result), « Aucun contact trouvé. » and the thread placeholders
  are lib `Text` (muted), no hand-styled paragraph; the thread keeps a ready-made `DataState` as is.
- **Composer icons (MAIR-872).** Attach, mention, business reference, emoji, send, attachment chips and
  mention suggestions render their lucide glyph through the lib `Icon` (`s`, 16 px token, current text colour);
  buttons keep their accessible names.
- **Dialogs (MAIR-878).** « Nouveau message » and « Créer un groupe » are small lib `Modal`s (480 px). The primary
  button (lib `SendButton` / `CreateButton` with its icon) stays disabled until the form is complete (recipient +
  message; group name + one member). A refusal shows as an `ErrorAlert` above the form, the dialog stays open and
  keeps the input; Escape, the backdrop and « Annuler » do nothing while the request is pending.
- **Page base (MAIR-1156).** Lib 2.3.0 page base: no footer (`showFooter={false}`), the module is the white
  bordered card (12 px radius, `--mairie-radius-l`) of the main area, and the only page title is the « Messagerie »
  `h1` of the list. « Messagerie » is active in the navigation with the unread total in the lib `Counter`, « 9+ »
  beyond 9; Administration stays role-gated.
- **Conversation list (MAIR-1157).** The list is titled « Messagerie » with a single « + » (lib `IconButton`, lib
  `ToolTip` « Nouvelle conversation ») opening a lib `DropdownMenu`: « Nouveau message » and « Créer un groupe » open
  the existing dialogs. The menu is announced as a menu, opens with Entrée / Espace / ↓, moves with ↑ ↓ Début Fin,
  closes on Échap, Tab or an outside click and gives the focus back to the « + » (`use-menu-keyboard.ts`, shared with
  the header menu). « Rechercher une conversation » is the lib `SearchField` filtering as the agent types (name,
  group, service); without result, « Aucune conversation trouvée. ». Each line shows the lib `Avatar` (photo or
  initials, groups included) with its presence dot, the name and the preview truncated on one line, the time in a
  fixed right column and the unread lib `Counter` (« 9+ »), spoken as « N messages non lus ».
- **Explicit icons (MAIR-1158).** Every icon goes through the lib `Icon` (lib 2.3 `icons` for the Messagerie
  glyphs). Composer: « Joindre un fichier » `file-up`, « Mentionner une personne » `at-sign`, « Lier un élément »
  `hash`, « Insérer un emoji » `smile-plus`, « Envoyer » `send`, each a lib `IconButton` with its `ToolTip`. Header:
  « Appeler » `phone` and « Lancer une visio » `video` are shown unavailable (`aria-disabled`, still focusable,
  tooltip « … · bientôt disponible »), « Rechercher dans la conversation » `text-search` only when wired, « Plus
  d'actions » `more-horizontal`. Menus: `check-check`, `trash`, `message-square-plus`, `users`. Linked elements:
  project `folder-kanban`, task `list-checks`, folder `folder-open`, event `calendar`, service `building-2`.
- **My bubbles (MAIR-1159).** My messages use the lib 2.3 tokens `--mairie-message-own-background` (#efebe2),
  `--mairie-message-own-on` (#383f51, contrast 8.8:1) and `--mairie-message-own-border` (#d6d0c3), their links and
  attachments too; received bubbles keep the white surface and `--mairie-border`. The time sits above the bubble,
  right-aligned for my messages.
- **Unread messages (MAIR-1160).** The « N notifications non lues » banner is gone (« Marquer comme lus » stays in
  « Plus d'actions »). A conversation opens on its first unread message, after the lib `Divider` « Nouveaux
  messages » (`NewMessagesSeparator`); the unread ones are the last `unreadCount` messages written by others. The
  neutral `UnreadMessagesPill` (lib `Button`, sticky at the bottom of the thread, polite live region) says « N
  nouveaux messages » and counts down as they come into view; a click scrolls smoothly to the last message (instant
  under `prefers-reduced-motion`). Reaching the end by the agent (wheel, touch, keyboard, pointer, pill) hides the pill
  and marks the conversation read; a thread that does not scroll is read when opened; the opening placement and other
  programmatic scrolls never read. The list and navigation counters both follow the refreshed conversation.
- **Delayed reception (MAIR-1161).** « Réception automatique active » and the other reception pills are gone: nothing
  is shown while the reception works. Once the real-time connection is lost, `MessagesReceptionDelayed` shows a small
  lib warning `Alert` « Réception des messages retardée » above the module, announced by its polite live region without
  taking the focus, with « Réessayer la réception ». On reconnection the stream resumes from its last event
  (`Last-Event-ID`) and the module reads the missed messages again, then the banner goes away.
- **Send status (MAIR-1162).** `MessageSendStatus` under my bubbles: « Envoyé » (check) under my last confirmed
  message, « Envoi… » (loader-circle turning only without `prefers-reduced-motion`, dimmed bubble) while the send is
  confirmed, « Non envoyé · Réessayer l'envoi » (circle-alert, lib link `Button` with refresh-cw, dashed error border)
  after a failure. Each change is spoken by a polite live region of the thread. A retry sends the same message once
  (one attempt per conversation; a composer send of a message the bubble already delivered writes nothing); the
  composer keeps its draft until a send is confirmed (MAIR-370) and releases it when the bubble delivered it unchanged.
  Only the thread scrolls: the composer keeps its height.
