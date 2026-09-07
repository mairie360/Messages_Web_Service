import type { components } from '@/contracts/bff';
type Schemas = components['schemas'];
import { getStoredAuthorizationHeader } from "@/lib/auth-token";

export type MessageId = string | number;
export type ConversationKind = "direct" | "group";
export type Presence = "online" | "offline" | "away";
export type MessageDirection = "incoming" | "outgoing";
export type BusinessReferenceKind = "project" | "task" | "event";

export type CurrentUserDto = Schemas['CurrentUserDtoSchema'];

export type AttachmentDto = Schemas['AttachmentDtoSchema'];

export type MentionDto = Schemas['MentionDtoSchema'];

export type ConversationDto = Schemas['ConversationDtoSchema'];

export type ContactDto = Schemas['ContactDtoSchema'];

export type MessageDto = Schemas['MessageDtoSchema'];

export type MessagingBootstrapResponse = Schemas['MessagingBootstrapResponse'];

export type ContactsResponse = Schemas['ContactsResponse'];

export type MessagesResponse = Schemas['MessagesResponse'];

export type SendMessageRequest = Schemas['SendMessageBody'];

export type SendMessageResponse = Schemas['SendMessageResponse'];

export type NewDirectMessageRequest = Schemas['NewDirectMessageBody'];

export type NewDirectMessageResponse = Schemas['NewDirectMessageResponse'];

export type CreateGroupRequest = Schemas['CreateGroupBody'];

export type CreateGroupResponse = Schemas['CreateGroupResponse'];

export type BusinessReferenceDto = {
  id: MessageId;
  title: string;
  kind: BusinessReferenceKind;
  description?: string;
  href?: string;
};

export type BusinessReferencesResponse = Schemas['BusinessReferencesResponse'];

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

  const response = await fetch(path, {
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
