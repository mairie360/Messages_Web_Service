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
  /**
   * MAIR-1166: what the tag mentions, from the suggestions of the conversation: a member (`mentionIds`), a group or
   * service (`groupMentionIds`) or everyone (`mentionEveryone`). Absent for the local options (a person).
   */
  target?: 'person' | 'group' | 'everyone';
}

/** MAIR-1166: what an agent may mention after `@` in a conversation (BFF `mention-suggestions`). */
export interface MessagingMentionSuggestions {
  everyone: boolean;
  groups: Array<{ id: MessagingContactId; name: string }>;
  people: Array<{ id: MessagingContactId; name: string }>;
}

/** MAIR-1166: remote suggestions of the composer; each request is aborted once the agent typed further. */
export interface MessagingTagSuggestionSources {
  mentions?: (query: string, signal: AbortSignal) => Promise<MessagingMentionSuggestions>;
  links?: (query: string, signal: AbortSignal) => Promise<MessagingBusinessReference[]>;
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
  /** MAIR-1165: number of members of a group conversation. */
  memberCount?: number;
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
  /** Day the message was written (« Aujourd’hui », « 28 oct. »): the thread opens a day separator when it changes. */
  dayLabel?: string;
  direction?: MessagingMessageDirection;
  authorId?: MessagingContactId;
  authorName?: string;
  /** MAIR-1162: state of my send, shown under the bubble (« Envoyé », « Envoi… », « Non envoyé »). */
  sendStatus?: MessagingSendStatus;
  /** MAIR-1165: `system` for a note the conversation writes itself (a membership change), centred in the thread. */
  kind?: 'user' | 'system';
  systemEvent?: MessagingSystemEvent;
  /** MAIR-1167: the text as written, when `content` is rendered (author line, tags). */
  text?: string;
  /** MAIR-1167: the message this one answers (`citation`) and its author and excerpt (`quoted`). */
  citation?: MessagingContactId;
  quoted?: { id: MessagingContactId; authorId?: MessagingContactId; authorName?: string; excerpt?: string; deleted?: boolean };
  /** MAIR-1168: last edit of the content. */
  editedAt?: string;
  /** MAIR-1169: a deleted message (tombstone): no content, no tag, no reaction, no action. */
  deleted?: boolean;
  /** MAIR-1170: the reactions, one per emoji. */
  reactions?: MessagingReaction[];
  /** MAIR-1166: tags of the message (BFF). */
  mentionsEveryone?: boolean;
  groupMentions?: Array<{ id: MessagingContactId; name?: string }>;
  links?: MessagingMessageLink[];
}

/** MAIR-1166: a project, task or event a message links to; `url` is its page when the BFF knows it. */
export interface MessagingMessageLink {
  id: MessagingContactId;
  kind: 'project' | 'task' | 'event';
  title?: string;
  url?: string;
}

/** MAIR-1165: a membership change recorded in the thread as a system note. */
export interface MessagingSystemEvent {
  action: 'members_added' | 'member_removed' | 'member_left';
  actorId: MessagingContactId;
  actorName?: string;
  userIds: MessagingContactId[];
  userNames: string[];
}

/** MAIR-1165: a member of a conversation (BFF `GET /conversations/{id}/members`). */
export interface MessagingMember {
  id: MessagingContactId;
  name: string;
  department?: string;
  /** The administrator of the group: its creator, while they stay a member. */
  isAdmin: boolean;
}

export interface MessagingMembers {
  members: MessagingMember[];
  /** Whether the agent may add and remove members. */
  canManage: boolean;
}

export type MessagingSendStatus = 'sending' | 'sent' | 'failed';

export interface MessagingSendMessagePayload {
  conversationId?: MessagingContactId;
  content: string;
  /** MAIR-1167: the message this one answers. */
  replyTo?: MessagingContactId;
  attachments?: MessagingAttachment[];
  mentions?: MessagingMention[];
  businessLinks?: MessagingBusinessReference[];
  context?: MessagingBusinessReference;
}

export interface NewMessagePayload {
  recipientId: MessagingContactId;
  message: string;
  /** The project, task or event the message is written about, sent as its business link. */
  context?: MessagingBusinessReference;
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

/** MAIR-1168: the new text of one of my messages and the tags it keeps. */
export interface MessagingEditPayload {
  content: string;
  mentions: MessagingMention[];
  businessLinks: MessagingBusinessReference[];
}

/** MAIR-1170: the reactions to a message with one emoji. */
export interface MessagingReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  /** Names of the agents who reacted, for the tooltip. */
  userNames: string[];
}
