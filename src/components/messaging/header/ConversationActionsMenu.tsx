import React from 'react';
import { CheckCheck, MoreVertical, Trash2 } from 'lucide-react';

import type { MessagingConversation } from '../types';
import { HeaderIconButton } from './HeaderIconButton';

export interface ConversationActionsMenuProps {
  conversation: MessagingConversation;
  label: string;
  deleteLabel: string;
  readPending: boolean;
  onMoreActions?: (conversation: MessagingConversation) => void;
  onDeleteConversation?: (conversation: MessagingConversation) => void;
  onReadVisibleMessages?: (conversation: MessagingConversation) => void;
}

/** "More actions" button; it opens a menu only when it holds read or delete. */
export const ConversationActionsMenu = ({
  conversation, label, deleteLabel, readPending, onMoreActions, onDeleteConversation, onReadVisibleMessages,
}: ConversationActionsMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const hasMenu = !!(onDeleteConversation || onReadVisibleMessages);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const run = (action: (conversation: MessagingConversation) => void) => {
    setOpen(false);
    action(conversation);
  };

  return (
    <div ref={menuRef} className="relative">
      <HeaderIconButton
        label={label}
        expanded={open}
        onClick={() => {
          if (hasMenu) setOpen((current) => !current);
          onMoreActions?.(conversation);
        }}
      >
        <MoreVertical className="size-4" strokeWidth={1.8} />
      </HeaderIconButton>
      {open && hasMenu && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-1 text-sm text-[var(--mairie-text)] shadow-lg">
          {onReadVisibleMessages && (
            <button
              type="button"
              disabled={readPending}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left transition hover:bg-[var(--mairie-background)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
              onClick={() => run(onReadVisibleMessages)}
            >
              <CheckCheck className="size-4 shrink-0" strokeWidth={1.8} />
              <span>Marquer les messages affichés comme lus</span>
            </button>
          )}
          {onDeleteConversation && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[var(--mairie-error-text)] transition hover:bg-[var(--mairie-error-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/25"
              onClick={() => run(onDeleteConversation)}
            >
              <Trash2 className="size-4 shrink-0" strokeWidth={1.8} />
              <span>{deleteLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
