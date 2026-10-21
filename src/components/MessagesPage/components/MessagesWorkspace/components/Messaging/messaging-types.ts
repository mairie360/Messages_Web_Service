import type React from 'react';

export type MessagingContactId = string | number;
export type MessagingConversationKind = 'direct' | 'group';
export type MessagingPresence = 'online' | 'offline' | 'away';
export type MessagingMessageDirection = 'incoming' | 'outgoing';
export type MessagingBusinessReferenceKind = 'project' | 'task' | 'event';
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
}

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
