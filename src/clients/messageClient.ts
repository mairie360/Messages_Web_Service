import type {
  GetContacts200,
  GetMe200,
  PostConversationsConversationIdMessagesBody,
  UploadAttachmentResponse,
  PostDirectMessagesBody,
  PostGroupsBody,
  PostConversationsConversationIdReadBody,
} from "@mairie360/bff-message-openapi/model";
import { bffMessage } from "../lib/bff-client";

// Types du contrat publié de BFF Message (@mairie360/bff-message-openapi, version épinglée dans package.json).
// Seuls les modèles de premier niveau sont nommés : les noms des sous-modèles orval changent avec le contrat.

export type MessageId = string | number;

export type { UploadAttachmentResponse };

export type CurrentUserDto = GetMe200["currentUser"];

export type ContactDto = GetContacts200["contacts"][number];

export { BffNavigationRequiredError, BffRequestError } from "../lib/bff-client";
export type { BffErrorDetail } from "../lib/bff-client";

function encodeId(id: MessageId) {
  return encodeURIComponent(String(id));
}

export const messageClient = {
  async getCurrentUser() {
    return (await bffMessage.getMe()).data;
  },

  async getBootstrap() {
    return (await bffMessage.getMessagingBootstrap()).data;
  },

  async getContacts() {
    return (await bffMessage.getContacts()).data;
  },

  async getBusinessReferences() {
    return (await bffMessage.getBusinessReferences()).data;
  },

  async getConversations(signal?: AbortSignal) {
    return (await bffMessage.getConversations(undefined, { signal })).data;
  },

  async getConversationMessages(conversationId: MessageId, signal?: AbortSignal) {
    return (await bffMessage.getConversationsConversationIdMessages(encodeId(conversationId), undefined, { signal })).data;
  },

  async acknowledgeVisibleMessages(conversationId: MessageId, readUntilMessageId: MessageId) {
    const body: PostConversationsConversationIdReadBody = { readUntilMessageId };
    const { data: reply } = await bffMessage.postConversationsConversationIdRead(encodeId(conversationId), body);
    if (!reply || String(reply.conversationId) !== String(conversationId) ||
        !Number.isSafeInteger(reply.unreadCount) || reply.unreadCount < 0) {
      throw new Error("L’acquittement des messages n’a pas été confirmé.");
    }
    return reply;
  },

  async uploadAttachments(files: File[]) {
    // The generated operation uploads one file per call (multipart part `files`); the replies are merged.
    const results: UploadAttachmentResponse["attachments"][] = [];
    let next = 0;
    let failed = false;
    // Independent uploads overlap within three workers. Keep selection order
    // and stop scheduling on failure; already-dispatched requests may settle.
    const uploadNext = async (): Promise<void> => {
      if (failed || next >= files.length) return;
      const index = next++;
      try {
        const { data } = await bffMessage.postAttachments({ files: files[index] });
        results[index] = (data as UploadAttachmentResponse).attachments;
      } catch (error) { failed = true; throw error; }
      return uploadNext();
    };
    await Promise.all(Array.from({ length: Math.min(3, files.length) }, uploadNext));
    return { attachments: results.flat() } as UploadAttachmentResponse;
  },

  async sendMessage(conversationId: MessageId, payload: PostConversationsConversationIdMessagesBody) {
    return (await bffMessage.postConversationsConversationIdMessages(encodeId(conversationId), payload)).data;
  },

  async createDirectMessage(payload: PostDirectMessagesBody) {
    return (await bffMessage.postDirectMessages(payload)).data;
  },

  async createGroup(payload: PostGroupsBody) {
    return (await bffMessage.postGroups(payload)).data;
  },

  async deleteConversation(conversationId: MessageId) {
    return (await bffMessage.deleteConversationsConversationId(encodeId(conversationId))).data;
  },
};
