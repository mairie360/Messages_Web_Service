import React from 'react';
import { Phone, Video } from 'lucide-react';

import { joinClasses } from './style';
import { ConversationActionsMenu } from './header/ConversationActionsMenu';
import { HeaderIconButton } from './header/HeaderIconButton';
import { HeaderIdentity } from './header/HeaderIdentity';
import type { MessagingConversation } from './types';

export interface MessagingChatHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  conversation?: MessagingConversation | null;
  callLabel?: string;
  videoCallLabel?: string;
  moreActionsLabel?: string;
  deleteConversationLabel?: string;
  onCall?: (conversation: MessagingConversation) => void;
  onVideoCall?: (conversation: MessagingConversation) => void;
  onMoreActions?: (conversation: MessagingConversation) => void;
  onDeleteConversation?: (conversation: MessagingConversation) => void;
  onReadVisibleMessages?: (conversation: MessagingConversation) => void;
  readPending?: boolean;
}

export const MessagingChatHeader = ({
  conversation,
  callLabel = 'Appeler',
  videoCallLabel = 'Appel vidéo',
  moreActionsLabel = "Plus d'actions",
  deleteConversationLabel = 'Supprimer la conversation',
  onCall,
  onVideoCall,
  onMoreActions,
  onDeleteConversation,
  onReadVisibleMessages,
  readPending = false,
  className = '',
  ...props
}: MessagingChatHeaderProps) => {
  if (!conversation) {
    return (
      <div
        className={joinClasses('flex min-h-[78px] items-center border-b border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4', className)}
        {...props}
      >
        <p className="text-sm text-[var(--mairie-muted)]">Sélectionnez une conversation</p>
      </div>
    );
  }

  return (
    <div
      className={joinClasses(
        'flex min-h-[78px] items-center justify-between gap-4 border-b border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4 text-[var(--mairie-text)] shadow-[var(--mairie-shadow)] sm:px-5',
        className
      )}
      {...props}
    >
      <HeaderIdentity conversation={conversation} />

      <div className="flex shrink-0 items-center gap-1.5">
        {onCall && (
          <HeaderIconButton label={callLabel} onClick={() => onCall(conversation)}>
            <Phone className="size-4" strokeWidth={1.8} />
          </HeaderIconButton>
        )}
        {onVideoCall && (
          <HeaderIconButton label={videoCallLabel} onClick={() => onVideoCall(conversation)}>
            <Video className="size-4" strokeWidth={1.8} />
          </HeaderIconButton>
        )}
        {(onMoreActions || onDeleteConversation || onReadVisibleMessages) && (
          <ConversationActionsMenu
            conversation={conversation}
            label={moreActionsLabel}
            deleteLabel={deleteConversationLabel}
            readPending={readPending}
            onMoreActions={onMoreActions}
            onDeleteConversation={onDeleteConversation}
            onReadVisibleMessages={onReadVisibleMessages}
          />
        )}
      </div>
    </div>
  );
};
