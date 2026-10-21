import React from 'react';
import { MessageSquare, Search, UsersRound } from 'lucide-react';

import { joinClasses } from './style';
import { MessagingConversationItem } from './MessagingConversationItem';
import type { MessagingContactId, MessagingConversation } from './types';

export interface MessagingSidebarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  conversations: MessagingConversation[];
  activeConversationId?: MessagingContactId;
  title?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  newMessageLabel?: string;
  createGroupLabel?: string;
  emptyLabel?: React.ReactNode;
  onSearchValueChange?: (value: string) => void;
  onConversationSelect?: (conversation: MessagingConversation) => void;
  onNewMessageClick?: () => void;
  onCreateGroupClick?: () => void;
}

const normalize = (value: React.ReactNode) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const MessagingSidebar = ({
  conversations,
  activeConversationId,
  title = 'Messagerie',
  searchPlaceholder = 'Rechercher un contact...',
  searchValue,
  newMessageLabel = 'Nouveau message',
  createGroupLabel = 'Créer un groupe',
  emptyLabel = 'Aucune conversation trouvée.',
  onSearchValueChange,
  onConversationSelect,
  onNewMessageClick,
  onCreateGroupClick,
  className = '',
  ...props
}: MessagingSidebarProps) => {
  const [internalSearch, setInternalSearch] = React.useState('');
  const currentSearch = searchValue ?? internalSearch;

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    if (searchValue === undefined) {
      setInternalSearch(nextValue);
    }

    onSearchValueChange?.(nextValue);
  };

  const filteredConversations = conversations.filter((conversation) => {
    const haystack = normalize(
      `${conversation.name} ${conversation.department ?? ''} ${conversation.lastMessage ?? ''}`
    );

    return haystack.includes(normalize(currentSearch));
  });

  return (
    <aside
      className={joinClasses(
        'flex min-h-0 flex-col border-b border-[var(--mairie-border)] bg-[var(--mairie-background)] p-4 text-[var(--mairie-text)] lg:border-b-0 lg:border-r',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-lg font-bold leading-7">{title}</h2>
        {(onNewMessageClick || onCreateGroupClick) && (
          <div className="flex shrink-0 gap-1.5">
            {onNewMessageClick && (
              <button
                type="button"
                aria-label={newMessageLabel}
                title={newMessageLabel}
                className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] text-[var(--mairie-text)] transition hover:bg-[var(--mairie-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                onClick={onNewMessageClick}
              >
                <MessageSquare className="size-4" strokeWidth={1.8} />
              </button>
            )}
            {onCreateGroupClick && (
              <button
                type="button"
                aria-label={createGroupLabel}
                title={createGroupLabel}
                className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] text-[var(--mairie-text)] transition hover:bg-[var(--mairie-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                onClick={onCreateGroupClick}
              >
                <UsersRound className="size-4" strokeWidth={1.8} />
              </button>
            )}
          </div>
        )}
      </div>

      <label className="relative mt-4 block">
        <span className="sr-only">{searchPlaceholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mairie-muted)]" />
        <input
          type="search"
          value={currentSearch}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] pl-10 pr-3 text-sm text-[var(--mairie-text)] outline-none transition placeholder:text-[var(--mairie-muted)] focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20"
          onChange={handleSearchChange}
        />
      </label>

      <div className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <MessagingConversationItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === activeConversationId}
              onClick={() => onConversationSelect?.(conversation)}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-4 text-center text-sm text-[var(--mairie-muted)]">
            {emptyLabel}
          </div>
        )}
      </div>
    </aside>
  );
};
