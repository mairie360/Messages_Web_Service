import type {
  BusinessReferencesResponse,
  DeleteConversationsConversationId200,
  GetContacts200,
  GetConversations200,
  GetConversationsConversationIdMessages200,
  GetMe200,
  GetMessagingBootstrap200,
  PostConversationsConversationIdMessages201,
  PostConversationsConversationIdMessagesBody,
  PostDirectMessages201,
  PostDirectMessagesBody,
  PostGroups201,
  PostGroupsBody,
} from "@mairie360/bff-message-openapi/model";

// Types du contrat publié de BFF Message (@mairie360/bff-message-openapi, version épinglée dans package.json).
// Seuls les modèles de premier niveau sont nommés : les noms des sous-modèles orval changent avec le contrat.

export type MessageId = string | number;

export type CurrentUserDto = GetMe200["currentUser"];

export type ContactDto = GetContacts200["contacts"][number];

/** Erreur HTTP renvoyée par le BFF, avec son statut. */
export class BffRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BffRequestError";
  }
}

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

    throw new BffRequestError(message, response.status);
  }

  return readJson<T>(response);
}

function encodeId(id: MessageId) {
  return encodeURIComponent(String(id));
}

export const messageClient = {
  getCurrentUser() {
    return bffRequest<GetMe200>("/me");
  },

  getBootstrap() {
    return bffRequest<GetMessagingBootstrap200>("/messaging/bootstrap");
  },

  getContacts() {
    return bffRequest<GetContacts200>("/contacts");
  },

  getBusinessReferences() {
    return bffRequest<BusinessReferencesResponse>("/business-references");
  },

  getConversations() {
    return bffRequest<GetConversations200>("/conversations");
  },

  getConversationMessages(conversationId: MessageId) {
    return bffRequest<GetConversationsConversationIdMessages200>(
      `/conversations/${encodeId(conversationId)}/messages`,
    );
  },

  sendMessage(conversationId: MessageId, payload: PostConversationsConversationIdMessagesBody) {
    return bffRequest<PostConversationsConversationIdMessages201>(
      `/conversations/${encodeId(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  createDirectMessage(payload: PostDirectMessagesBody) {
    return bffRequest<PostDirectMessages201>("/direct-messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createGroup(payload: PostGroupsBody) {
    return bffRequest<PostGroups201>("/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteConversation(conversationId: MessageId) {
    return bffRequest<DeleteConversationsConversationId200>(`/conversations/${encodeId(conversationId)}`, {
      method: "DELETE",
    });
  },
};
