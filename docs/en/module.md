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
read is refused. New message/group dialogs opened after recovery keep initial
focus, Tab/Shift+Tab containment, enabled Close/Escape and return to the opener.

A confirmed deletion or disappearance immediately reads the replacement thread,
including the first arrival in an empty list. Visible reception runs every two
seconds, skipping pending reads, selection and mutations. Confirmed unread counts
stay authoritative; stale replies cannot overwrite newer selections or writes.
Refused reads retain known data and expose recovery, not simulated success.

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

The composed consumer has genuine390×844 native evidence for keyboard bootstrap
recovery, pane switching, both creation-dialog focus lifecycles, mobile navigation,
two-second non-overlapping reception, confirmed disappearance/read recovery and
confirmed empty data. The recipe makes GET requests only; write flows are not
certified by it. Recipient draft isolation remains the separate library #407
defect, reproduced without sending. See README for exact sessions and bounds;
this candidate-only verification is not a new paired old-source or deployed test.

The installed 0.4.0 contract and isolated fixtures do not prove durable binary
storage, persistent read acknowledgement or deployed permissions. Current upstream
read acknowledgement is refused; the frontend does not call it or invent a zero
counter. Downloads/business links (#176), persistent acknowledgement (#149/#144)
and composer-recipient draft isolation (lib-components #407) remain separate open
acceptance. Local candidate tests do not prove green applicable CI, integration
into main, exact refreshed local delivery, full-route RGAA or a complete image.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
