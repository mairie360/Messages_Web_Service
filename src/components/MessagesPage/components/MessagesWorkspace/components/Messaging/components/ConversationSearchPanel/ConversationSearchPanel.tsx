import React from 'react';
import { Button, DataState, Drawer, SearchField, Tabs, Text } from '@mairie360/lib-components/primitives';

import { SearchMessageResult } from './components/SearchMessageResult';
import { SearchPersonResult } from './components/SearchPersonResult';
import { useConversationSearch } from './use-conversation-search';
import type {
  MessagingContactId,
  MessagingConversation,
  MessagingSearchMessageItem,
  MessagingSearchPage,
  MessagingSearchPersonItem,
  MessagingSearchRequest,
  MessagingSearchType,
} from '../../messaging-types';

export interface ConversationSearchPanelProps {
  open: boolean;
  conversation: MessagingConversation | null;
  /** The agent: never offered « Écrire » to themselves. */
  currentUserId?: MessagingContactId;
  onClose: () => void;
  onSearch?: (request: MessagingSearchRequest) => Promise<MessagingSearchPage>;
  /** A message (or a file) was chosen: the panel closes, then the thread scrolls to it. */
  onOpenMessage: (messageId: MessagingContactId) => void;
  /** « Écrire » of a person: the direct conversation with them. */
  onWriteTo?: (person: MessagingSearchPersonItem) => void;
}

const TAB_LABELS: Record<MessagingSearchType, string> = { messages: 'Messages', files: 'Fichiers', people: 'Personnes' };
const EMPTY_TITLES: Record<MessagingSearchType, string> = {
  messages: 'Aucun message trouvé',
  files: 'Aucun fichier trouvé',
  people: 'Aucune personne trouvée',
};

/**
 * « Rechercher dans la conversation » (MAIR-1164, Figma F10): lib `Drawer` size m (focus trapped, given back to
 * the opener on close), a `SearchField`, fixed lib `Tabs` Messages · Fichiers · Personnes with their counters, and
 * the results of the selected tab scrolling below them. Loading, error and empty results are lib `DataState`s.
 */
export const ConversationSearchPanel = ({
  open, conversation, currentUserId, onClose, onSearch, onOpenMessage, onWriteTo,
}: ConversationSearchPanelProps) => {
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState<MessagingSearchType>('messages');
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const conversationKey = open && conversation ? String(conversation.id) : null;
  const search = useConversationSearch(conversationKey, query, onSearch);

  React.useEffect(() => {
    if (!open) { setQuery(''); setTab('messages'); return; }
    // The lib dialog focuses its close button first; the agent came here to type.
    const timer = window.setTimeout(() => fieldRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const page = search.pages[tab];
  const items = page?.items ?? [];
  const openMessage = (item: MessagingSearchMessageItem) => { onClose(); onOpenMessage(item.messageId); };

  const results = () => {
    if (!query.trim()) {
      return <Text as="p" size="s" tone="muted">Saisissez un mot pour rechercher dans les messages, les fichiers et les membres.</Text>;
    }
    if (search.status === 'loading' || search.status === 'idle') return <DataState state="loading" size="s" title="Recherche en cours…" />;
    if (search.status === 'error') {
      return <DataState state="error" size="s" title="La recherche est indisponible." onRetry={search.retry} />;
    }
    if (items.length === 0) return <DataState state="empty" size="s" title={EMPTY_TITLES[tab]} description={`Aucun résultat pour « ${query.trim()} ».`} />;
    return (
      <>
        <ul className="flex flex-col gap-2" aria-label={`Résultats : ${TAB_LABELS[tab]}`}>
          {items.map(item => (
            <li key={'messageId' in item ? String(item.messageId) : String(item.id)}>
              {'messageId' in item
                ? <SearchMessageResult item={item} onOpen={openMessage} />
                : <SearchPersonResult
                    person={item}
                    onWrite={onWriteTo && String(item.id) !== String(currentUserId) ? person => { onClose(); onWriteTo(person); } : undefined}
                  />}
            </li>
          ))}
        </ul>
        {page?.hasMore && (
          <Button className="mt-3" variant="ghost" size="s" label="Afficher plus de résultats" loading={search.loadingMore} onClick={() => void search.loadMore(tab)} />
        )}
      </>
    );
  };

  return (
    <Drawer open={open && conversation !== null} size="m" title="Rechercher dans la conversation" onClose={onClose}>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <SearchField
          ref={fieldRef}
          label="Rechercher"
          placeholder={conversation ? `Rechercher dans « ${conversation.name} »` : 'Rechercher'}
          value={query}
          maxLength={150}
          onChange={event => setQuery(event.target.value)}
          onClear={() => setQuery('')}
        />
        <Tabs
          label="Type de résultats"
          value={tab}
          onChange={setTab}
          size="s"
          items={(Object.keys(TAB_LABELS) as MessagingSearchType[]).map(key => ({
            key, label: TAB_LABELS[key], count: search.status === 'ready' ? search.pages[key]?.total ?? 0 : undefined,
          }))}
          hostPanel
          id="conversation-search"
          className="shrink-0"
        />
        <div
          id={`conversation-search-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`conversation-search-tab-${tab}`}
          aria-busy={search.status === 'loading'}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {results()}
        </div>
      </div>
    </Drawer>
  );
};
