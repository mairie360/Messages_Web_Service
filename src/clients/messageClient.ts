import { getStoredAuthorizationHeader } from "@/lib/auth-token";

export type MessageId = string | number;
export type ConversationKind = "direct" | "group";
export type Presence = "online" | "offline" | "away";
export type MessageDirection = "incoming" | "outgoing";
export type BusinessReferenceKind = "project" | "task" | "event";

export type CurrentUserDto = {
  id: MessageId;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  phone?: string;
  service?: string;
  position?: string;
  address?: string;
  city?: string;
  lastConnection?: string;
};

export type AttachmentDto = {
  id: MessageId;
  name: string;
  size?: number;
  type?: string;
  url?: string;
};

export type MentionDto = {
  id: MessageId;
  name: string;
  kind?: ConversationKind;
  description?: string;
};

export type ConversationDto = {
  id: MessageId;
  name: string;
  department?: string;
  kind?: ConversationKind;
  avatarUrl?: string;
  initials?: string;
  presence?: Presence;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  memberIds?: MessageId[];
};

export type ContactDto = {
  id: MessageId;
  name: string;
  department?: string;
  avatarUrl?: string;
  initials?: string;
  presence?: Presence;
};

export type MessageDto = {
  id: MessageId;
  conversationId: MessageId;
  content: string;
  sentAt: string;
  authorId: MessageId;
  authorName?: string;
  direction?: MessageDirection;
  attachments?: AttachmentDto[];
  mentions?: MentionDto[];
};

export type MessagingBootstrapResponse = {
  currentUser: CurrentUserDto;
  conversations: ConversationDto[];
  contacts?: ContactDto[];
  activeConversationId?: MessageId;
  messages: MessageDto[];
};

export type ContactsResponse = {
  contacts: ContactDto[];
};

export type MessagesResponse = {
  conversation: ConversationDto;
  messages: MessageDto[];
  nextCursor?: string;
};

export type SendMessageRequest = {
  content: string;
  attachmentIds?: MessageId[];
  mentionIds?: MessageId[];
};

export type SendMessageResponse = {
  conversation?: ConversationDto;
  message?: MessageDto;
  messages?: MessageDto[];
};

export type NewDirectMessageRequest = {
  recipientId: MessageId;
  message: string;
};

export type NewDirectMessageResponse = {
  conversation: ConversationDto;
  message: MessageDto;
};

export type CreateGroupRequest = {
  name: string;
  description?: string;
  memberIds: MessageId[];
};

export type CreateGroupResponse = {
  conversation: ConversationDto;
};

export type BusinessReferenceDto = {
  id: MessageId;
  title: string;
  kind: BusinessReferenceKind;
  description?: string;
  href?: string;
};

export type BusinessReferencesResponse = {
  references: BusinessReferenceDto[];
  sources?: {
    projects?: "available" | "unavailable";
    calendar?: "available" | "unavailable";
  };
};

const BFF_BASE_PATH = "/api/bff";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) return undefined as T;

  return JSON.parse(text) as T;
}

async function bffRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const authorizationHeader = getStoredAuthorizationHeader();

  if (authorizationHeader && !headers.has("Authorization")) {
    headers.set("Authorization", authorizationHeader);
  }

  const response = await fetch(`${BFF_BASE_PATH}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await readJson<{ message?: string; error?: { message?: string } }>(
      response,
    ).catch(() => null);
    const message =
      errorBody?.error?.message ??
      errorBody?.message ??
      `Erreur BFF messages (${response.status})`;

    throw new Error(message);
  }

  return readJson<T>(response);
}

function encodeId(id: MessageId) {
  return encodeURIComponent(String(id));
}

export const messageClient = {
  getBootstrap() {
    return bffRequest<MessagingBootstrapResponse>("/messaging/bootstrap");
  },

  getContacts() {
    return bffRequest<ContactsResponse>("/contacts");
  },

  getBusinessReferences() {
    return bffRequest<BusinessReferencesResponse>("/business-references");
  },

  getConversationMessages(conversationId: MessageId) {
    return bffRequest<MessagesResponse>(
      `/conversations/${encodeId(conversationId)}/messages`,
    );
  },

  sendMessage(conversationId: MessageId, payload: SendMessageRequest) {
    return bffRequest<SendMessageResponse>(
      `/conversations/${encodeId(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  createDirectMessage(payload: NewDirectMessageRequest) {
    return bffRequest<NewDirectMessageResponse>("/direct-messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createGroup(payload: CreateGroupRequest) {
    return bffRequest<CreateGroupResponse>("/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteConversation(conversationId: MessageId) {
    return bffRequest<void>(`/conversations/${encodeId(conversationId)}`, {
      method: "DELETE",
    });
  },
};
