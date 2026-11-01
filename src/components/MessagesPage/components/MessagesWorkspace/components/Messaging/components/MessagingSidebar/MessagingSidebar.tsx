import React from 'react';

import { joinClasses } from '../../messaging-style';
import { ConversationList } from './components/ConversationList';
import { ConversationSearch } from './components/ConversationSearch';
import { SidebarHeader } from './components/SidebarHeader';
import { filterConversations } from './filter-conversations';
import type { MessagingContactId, MessagingConversation } from '../../messaging-types';

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

  const handleSearchChange = (nextValue: string) => {
    if (searchValue === undefined) {
      setInternalSearch(nextValue);
    }

    onSearchValueChange?.(nextValue);
  };

  return (
    <aside
      className={joinClasses(
        'flex min-h-0 flex-col border-b border-[var(--mairie-border)] bg-[var(--mairie-background)] p-4 text-[var(--mairie-text)] lg:border-b-0 lg:border-r',
        className
      )}
      {...props}
    >
      <SidebarHeader
        title={title}
        newMessageLabel={newMessageLabel}
        createGroupLabel={createGroupLabel}
        onNewMessageClick={onNewMessageClick}
        onCreateGroupClick={onCreateGroupClick}
      />
      <ConversationSearch placeholder={searchPlaceholder} value={currentSearch} onChange={handleSearchChange} />
      <ConversationList
        conversations={filterConversations(conversations, currentSearch)}
        activeConversationId={activeConversationId}
        emptyLabel={emptyLabel}
        onSelect={onConversationSelect}
      />
    </aside>
  );
};
