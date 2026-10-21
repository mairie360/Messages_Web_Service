import type { MessagingConversation } from '../types';

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Conversations whose name, department or last message contains the search, ignoring accents and case. */
export const filterConversations = (conversations: MessagingConversation[], search: string) =>
  conversations.filter((conversation) =>
    normalize(`${conversation.name} ${conversation.department ?? ''} ${conversation.lastMessage ?? ''}`)
      .includes(normalize(search))
  );
