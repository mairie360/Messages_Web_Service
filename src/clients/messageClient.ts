import { parseMessagingBootstrapReceipt } from '../lib/messaging-bootstrap-receipt';
import type {
  GetContacts200,
  GetMe200,
  PostConversationsConversationIdMessagesBody,
  UploadAttachmentResponse,
  PostDirectMessagesBody,
  PostGroupsBody,
  PostConversationsConversationIdReadBody,
  GetConversationsConversationIdSearchParams,
  PatchConversationsConversationIdMessagesMessageIdBody,
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
    return parseMessagingBootstrapReceipt((await bffMessage.getMessagingBootstrap()).data);
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

  /** MAIR-1168: edit one of my messages (text and tags); the answer is the message after the edit. */
  async editMessage(conversationId: MessageId, messageId: MessageId, body: PatchConversationsConversationIdMessagesMessageIdBody) {
    return (await bffMessage.patchConversationsConversationIdMessagesMessageId(encodeId(conversationId), encodeId(messageId), body)).data;
  },

  /** MAIR-1169: delete one of my messages; the answer is its tombstone (`deleted: true`). */
  async deleteMessage(conversationId: MessageId, messageId: MessageId) {
    return (await bffMessage.deleteConversationsConversationIdMessagesMessageId(encodeId(conversationId), encodeId(messageId))).data;
  },

  /** MAIR-1166: what the agent may mention after `@` in a conversation. */
  async getMentionSuggestions(conversationId: MessageId, q: string, signal?: AbortSignal) {
    return (await bffMessage.getConversationsConversationIdMentionSuggestions(encodeId(conversationId), { q }, { signal })).data;
  },

  /** MAIR-1166: the projects, events and tasks the agent may link after `#`. */
  async getLinkSuggestions(q: string, signal?: AbortSignal) {
    return (await bffMessage.getLinkSuggestions({ q }, { signal })).data;
  },

  /** MAIR-1165: the members of a conversation and whether the agent may manage them. */
  async getMembers(conversationId: MessageId, signal?: AbortSignal) {
    return (await bffMessage.getConversationsConversationIdMembers(encodeId(conversationId), { signal })).data;
  },

  /** MAIR-1165: add agents to a group; the answer carries the system note of the change. */
  async addMembers(conversationId: MessageId, userIds: MessageId[]) {
    return (await bffMessage.postConversationsConversationIdMembers(encodeId(conversationId), { userIds })).data;
  },

  async removeMember(conversationId: MessageId, userId: MessageId) {
    return (await bffMessage.deleteConversationsConversationIdMembersUserId(encodeId(conversationId), encodeId(userId))).data;
  },

  /** MAIR-1165: leave a group (204). */
  async leaveConversation(conversationId: MessageId) {
    await bffMessage.postConversationsConversationIdLeave(encodeId(conversationId));
  },

  /** MAIR-1164: one page of the messages, files or people of a conversation matching `q`. */
  async searchConversation(conversationId: MessageId, params: GetConversationsConversationIdSearchParams, signal?: AbortSignal) {
    return (await bffMessage.getConversationsConversationIdSearch(encodeId(conversationId), params, { signal })).data;
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
