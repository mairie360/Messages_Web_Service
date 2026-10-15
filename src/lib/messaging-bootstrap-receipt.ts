// Field projection derived from the pinned published GetMessagingBootstrap200 response.
import { choice, list, number, optional, record, text, union } from './receipt-readers';
const dto2 = choice(["online", "offline", "away"]);
const dto1 = record({ "avatarUrl": optional(text), "department": optional(text), "email": optional(text), "id": union(text, number), "initials": optional(text), "name": text, "presence": optional(dto2) });
const dto4 = choice(["direct", "group"]);
const dto5 = choice(["online", "offline", "away"]);
const dto3 = record({ "avatarUrl": optional(text), "contactId": optional(union(text, number)), "department": optional(text), "id": union(text, number), "initials": optional(text), "kind": optional(dto4), "lastMessage": optional(text), "lastMessageAt": optional(text), "memberCount": optional(number), "name": text, "presence": optional(dto5), "unreadCount": optional(number) });
// Only identity fields used by this workspace cross its server/client boundary.
const dto6 = record({ "id": union(text, number), "name": text });
const dto8 = record({ "id": union(text, number), "name": text, "size": optional(number), "type": optional(text), "url": optional(text) });
const dto9 = choice(["incoming", "outgoing"]);
const dto11 = choice(["direct", "group"]);
const dto10 = record({ "description": optional(text), "id": union(text, number), "kind": optional(dto11), "name": text });
const dto12 = record({ "authorId": optional(union(text, number)), "authorName": optional(text), "excerpt": text, "id": union(text, number) });
const dto7 = record({ "attachments": optional(list(dto8)), "authorId": optional(union(text, number)), "authorName": optional(text), "citation": optional(union(text, number)), "content": text, "conversationId": union(text, number), "direction": optional(dto9), "id": union(text, number), "mentions": optional(list(dto10)), "quoted": optional(dto12), "sentAt": text });
const dto0 = record({ "activeConversationId": optional(union(text, number)), "contacts": list(dto1), "conversations": list(dto3), "currentUser": dto6, "messages": list(dto7) });

export const readGetMessagingBootstrap200 = dto0;

import type { GetMessagingBootstrap200, GetConversationsConversationIdMessages200 } from '@mairie360/bff-message-openapi/model';
const validId = (value: unknown) => typeof value === 'string' ? value.trim().length > 0 : typeof value === 'number' && Number.isFinite(value);
const distinct = (values: unknown[]) => values.every(validId) && new Set(values.map(String)).size === values.length;
export function parseMessagingBootstrapReceipt(value: unknown): GetMessagingBootstrap200 {
  const data = readGetMessagingBootstrap200(value) as GetMessagingBootstrap200;
  const conversations = data.conversations.map(conversation => String(conversation.id));
  if (!validId(data.currentUser.id) || !distinct(data.conversations.map(conversation => conversation.id)) || !distinct(data.messages.map(message => message.id)) ||
      data.messages.some(message => !conversations.includes(String(message.conversationId))) ||
      data.activeConversationId !== undefined && data.activeConversationId !== '' && !conversations.includes(String(data.activeConversationId))) throw new Error('Les conversations reçues ne sont pas cohérentes.');
  return data;
}
const thread = record({ conversation: dto3, messages: list(dto7) });
export function parseMessagingThreadReceipt(value: unknown, requested: string | number): GetConversationsConversationIdMessages200 {
  const data = thread(value) as GetConversationsConversationIdMessages200;
  if (String(data.conversation.id) !== String(requested) || !distinct(data.messages.map(message => message.id)) || data.messages.some(message => String(message.conversationId) !== String(requested))) throw new Error('La conversation reçue ne correspond pas à la demande.');
  return data;
}
export type InitialMessagingPage = { status: 'confirmed'; data: GetMessagingBootstrap200; requested: string; thread?: GetConversationsConversationIdMessages200 } | { status: 'unavailable'; message: string };
export const MESSAGES_INITIAL_UNAVAILABLE = 'Le premier chargement de la messagerie est indisponible. Réessayez dans cette page.';
export function readInitialMessagingPage(initial?: InitialMessagingPage) {
  if (initial?.status !== 'confirmed') return null;
  try { return { ...initial, data: parseMessagingBootstrapReceipt(initial.data), thread: initial.thread ? parseMessagingThreadReceipt(initial.thread, initial.requested) : undefined }; } catch { return null; }
}
