# Messages_Web_Service — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Provide the instant-messaging interface with conversations, contacts and links to business objects. Calls go through BFF Message.

## Audience and value

Staff exchanging messages with colleagues or work groups.

Business domain: Instant messaging.

## Available capabilities

- Conversation list, active messages and contact search, with refresh while the tab is visible.
- Direct messages, conversation replies, group creation and deletion.
- Load project, task and event references, refreshing suggestions when returning to the visible tab. Temporary failures retain the last successful list; an access refusal clears it.

## Typical workflow

1. Load `/messaging/bootstrap` and select a conversation.
2. Find a contact or business reference, then send a message.
3. Inspect messages returned by the BFF; the list and active thread sync when the tab resumes and every ten seconds while it stays visible.

## Role within Mairie360

Associated repositories: [BFF_Message](https://github.com/mairie360/BFF_Message).

This repository contains the browser interface and its Next.js adapters. The associated BFF supplies business data and coordinates its sources.

## Data and current state

Conversations and messages use Message API. Contacts are read directly from the SQL `users` table, including the current user (token `sub` identifier). Business references are aggregated from BFF Project and BFF Calendar. Local profile edits, attachment metadata and the read acknowledgement do not provide complete persistence.

## Scope and limitations

Attachment upload currently creates metadata and does not provide durable binary storage. Mark-as-read returns a zero counter without writing to Message API: the frontend does not use it to acknowledge messages and keeps the counts supplied by the BFF. Conversation groups use the API, while some profile data remains local to the process.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
