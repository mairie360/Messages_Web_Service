import { MessagingContactAvatar } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessagingContactAvatar';
import type { MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

const presenceLabel = {
  online: 'En ligne',
  away: 'Absent',
  offline: 'Hors ligne',
};

/** "Department • presence" line under the conversation name. */
export const conversationMeta = (conversation: MessagingConversation) =>
  [conversation.department, conversation.presence ? presenceLabel[conversation.presence] : undefined]
    .filter(Boolean)
    .join(' • ');

export const HeaderIdentity = ({ conversation }: { conversation: MessagingConversation }) => {
  const meta = conversationMeta(conversation);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MessagingContactAvatar
        name={conversation.name}
        src={conversation.avatarUrl}
        initials={conversation.initials}
        presence={conversation.presence}
        size="lg"
      />
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold leading-6">{conversation.name}</h3>
        {meta && <p className="truncate text-sm leading-5 text-[var(--mairie-muted)]">{meta}</p>}
      </div>
    </div>
  );
};
