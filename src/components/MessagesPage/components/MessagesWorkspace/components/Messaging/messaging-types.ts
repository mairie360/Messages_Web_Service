import type React from 'react';

export type MessagingContactId = string | number;
export type MessagingConversationKind = 'direct' | 'group';
export type MessagingPresence = 'online' | 'offline' | 'away';
export type MessagingMessageDirection = 'incoming' | 'outgoing';
export type MessagingBusinessReferenceKind = 'project' | 'task' | 'event' | 'folder' | 'service';
export type MessagingSendResult = void | boolean | Promise<void | boolean>;

export interface MessagingAttachment {
  id: MessagingContactId;
  name: string;
  size?: number;
  type?: string;
  url?: string;
}

export interface MessagingMention {
  id: MessagingContactId;
  name: string;
  kind?: MessagingConversationKind;
  description?: string;
}

export interface MessagingBusinessReference {
  id: MessagingContactId;
  title: string;
  kind: MessagingBusinessReferenceKind;
  description?: string;
  href?: string;
}

export interface MessagingConversation {
  id: MessagingContactId;
  name: string;
  department?: string;
  kind?: MessagingConversationKind;
  avatarUrl?: string;
  initials?: string;
  presence?: MessagingPresence;
  lastMessage?: React.ReactNode;
  lastMessageAt?: string;
  unreadCount?: number;
  memberIds?: MessagingContactId[];
  /** The other person of a direct conversation (BFF `contactId`, MAIR-204). */
  contactId?: MessagingContactId;
}

export interface MessagingMessage {
  id: MessagingContactId;
  conversationId?: MessagingContactId;
  content: React.ReactNode;
  attachments?: MessagingAttachment[];
  mentions?: MessagingMention[];
  businessLinks?: MessagingBusinessReference[];
  context?: MessagingBusinessReference;
  sentAt?: string;
  direction?: MessagingMessageDirection;
  authorId?: MessagingContactId;
  authorName?: string;
  /** MAIR-1162: state of my send, shown under the bubble (« Envoyé », « Envoi… », « Non envoyé »). */
  sendStatus?: MessagingSendStatus;
}

export type MessagingSendStatus = 'sending' | 'sent' | 'failed';

export interface MessagingSendMessagePayload {
  conversationId?: MessagingContactId;
  content: string;
  attachments?: MessagingAttachment[];
  mentions?: MessagingMention[];
  businessLinks?: MessagingBusinessReference[];
  context?: MessagingBusinessReference;
}

export interface NewMessagePayload {
  recipientId: MessagingContactId;
  message: string;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  memberIds: MessagingContactId[];
}

/** MAIR-1164: the three tabs of « Rechercher dans la conversation ». */
export type MessagingSearchType = 'messages' | 'files' | 'people';

/** A message found by a search: its excerpt and the matches in it (UTF-16 offsets, as JavaScript counts them). */
export interface MessagingSearchMessageItem {
  messageId: MessagingContactId;
  authorId?: MessagingContactId;
  authorName?: string;
  createdAt: string;
  excerpt: string;
  highlights: Array<{ start: number; length: number }>;
}

/** A member found by a search. */
export interface MessagingSearchPersonItem {
  id: MessagingContactId;
  name: string;
}

/** One page of results of a search in a conversation (BFF `GET /conversations/{id}/search`). */
export interface MessagingSearchPage {
  type: MessagingSearchType;
  items: Array<MessagingSearchMessageItem | MessagingSearchPersonItem>;
  hasMore: boolean;
  total: number;
}

export interface MessagingSearchRequest {
  query: string;
  type: MessagingSearchType;
  offset?: number;
  signal?: AbortSignal;
}
