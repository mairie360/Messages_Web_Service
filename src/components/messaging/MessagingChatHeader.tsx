import React from 'react';
import { CheckCheck, MoreVertical, Phone, Trash2, Video } from 'lucide-react';

import { joinClasses } from './style';
import { MessagingContactAvatar } from './MessagingContactAvatar';
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

const presenceLabel = {
  online: 'En ligne',
  away: 'Absent',
  offline: 'Hors ligne',
};

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
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!actionsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionsOpen]);

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

  const meta = [conversation.department, conversation.presence ? presenceLabel[conversation.presence] : undefined]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      className={joinClasses(
        'flex min-h-[78px] items-center justify-between gap-4 border-b border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4 text-[var(--mairie-text)] shadow-[var(--mairie-shadow)] sm:px-5',
        className
      )}
      {...props}
    >
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

      <div className="flex shrink-0 items-center gap-1.5">
        {onCall && (
          <button
            type="button"
            aria-label={callLabel}
            title={callLabel}
            className="inline-flex size-9 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
            onClick={() => onCall(conversation)}
          >
            <Phone className="size-4" strokeWidth={1.8} />
          </button>
        )}
        {onVideoCall && (
          <button
            type="button"
            aria-label={videoCallLabel}
            title={videoCallLabel}
            className="inline-flex size-9 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
            onClick={() => onVideoCall(conversation)}
          >
            <Video className="size-4" strokeWidth={1.8} />
          </button>
        )}
        {(onMoreActions || onDeleteConversation || onReadVisibleMessages) && (
          <div ref={actionsRef} className="relative">
            <button
              type="button"
              aria-label={moreActionsLabel}
              title={moreActionsLabel}
              aria-expanded={actionsOpen}
              className="inline-flex size-9 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
              onClick={() => {
                if (onDeleteConversation || onReadVisibleMessages) setActionsOpen((open) => !open);
                onMoreActions?.(conversation);
              }}
            >
              <MoreVertical className="size-4" strokeWidth={1.8} />
            </button>
            {actionsOpen && (onDeleteConversation || onReadVisibleMessages) && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-1 text-sm text-[var(--mairie-text)] shadow-lg">
                {onReadVisibleMessages && (
                  <button
                    type="button"
                    disabled={readPending}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left transition hover:bg-[var(--mairie-background)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                    onClick={() => {
                      setActionsOpen(false);
                      onReadVisibleMessages(conversation);
                    }}
                  >
                    <CheckCheck className="size-4 shrink-0" strokeWidth={1.8} />
                    <span>Marquer les messages affichés comme lus</span>
                  </button>
                )}
                {onDeleteConversation && <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[var(--mairie-error-text)] transition hover:bg-[var(--mairie-error-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/25"
                  onClick={() => {
                    setActionsOpen(false);
                    onDeleteConversation(conversation);
                  }}
                >
                  <Trash2 className="size-4 shrink-0" strokeWidth={1.8} />
                  <span>{deleteConversationLabel}</span>
                </button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
