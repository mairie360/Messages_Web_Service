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
  PostAttachments201,
  PostDirectMessages201,
  PostDirectMessagesBody,
  PostGroups201,
  PostGroupsBody,
  PostConversationsConversationIdRead200,
  PostConversationsConversationIdReadBody,
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

/** A browser-managed redirect needs a page navigation, not a cross-origin data fetch. */
export class BffNavigationRequiredError extends Error {
  constructor() {
    super("La connexion doit être vérifiée en rouvrant la page.");
    this.name = "BffNavigationRequiredError";
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

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  // Manual browser redirects intentionally hide Location/status/body. Never
  // invent a 401, inspect an opaque body or navigate to an unverified target.
  if (response.type === "opaqueredirect") {
    throw new BffNavigationRequiredError();
  }

  if (!response.ok) {
    const errorBody = await readJson<{ message?: string; error?: { message?: string } }>(
      response,
    ).catch(() => null);
    const serviceMessage = [errorBody?.error?.message, errorBody?.message].find(
      (value) => typeof value === "string" && value.trim(),
    );
    const message = serviceMessage ?? (
      response.status >= 500
        ? "Le service de messagerie est temporairement indisponible."
        : "La demande n’a pas pu aboutir."
    );

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
    return bffRequest<GetConversations200>("/conversations", { redirect: "manual" });
  },

  getConversationMessages(conversationId: MessageId) {
    return bffRequest<GetConversationsConversationIdMessages200>(
      `/conversations/${encodeId(conversationId)}/messages`,
      { redirect: "manual" },
    );
  },

  async acknowledgeVisibleMessages(conversationId: MessageId, readUntilMessageId: MessageId) {
    const body: PostConversationsConversationIdReadBody = { readUntilMessageId };
    const reply = await bffRequest<PostConversationsConversationIdRead200>(
      `/conversations/${encodeId(conversationId)}/read`,
      { method: "POST", redirect: "manual", body: JSON.stringify(body) },
    );
    if (!reply || String(reply.conversationId) !== String(conversationId) ||
        !Number.isSafeInteger(reply.unreadCount) || reply.unreadCount < 0) {
      throw new Error("L’acquittement des messages n’a pas été confirmé.");
    }
    return reply;
  },

  uploadAttachments(files: File[]) {
    const body = new FormData();
    files.forEach((file) => body.append("files", file, file.name));
    return bffRequest<PostAttachments201>("/attachments", {
      method: "POST",
      body,
    });
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
