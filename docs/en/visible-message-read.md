# Explicit acknowledgement of displayed messages — MAIR-269

The existing thread actions menu includes “Marquer les messages affichés comme
lus” through the published shared UI 0.6.12. The component identifies the last
message intersecting the visible thread after the menu closes. Hidden threads,
an absent message and stale selections cannot start the command.
An empty confirmed thread keeps deletion available and offers the read action
once a message is received, without acknowledging it automatically.

The frontend calls the existing published Message 0.4.0 operation
`POST /conversations/{conversationId}/read` with an explicit
`readUntilMessageId`. It does not acknowledge during bootstrap, focus or polling,
and it never clears a counter locally. After a consistent success reply, a fresh
`GET /conversations` supplies the displayed unread counters. The old provider's
reply zero is insufficient. A selection change or unmount invalidates late
responses; a refusal retains the known thread and counters with a retry message.

Tests execute the real frontend page, proxy and published contract mocks,
including concurrent commands, stale POST/GET responses, inconsistent replies
and refusals. They do not certify deployed authentication, permissions or durable
read state. These require an available dev account and service deployment proof.
The BFF package pin and API/BFF sources remain unchanged.
