import React from 'react';
import { DateTime, Text } from '@mairie360/lib-components/primitives';

import { highlightSegments } from '../../search-highlights';
import type { MessagingSearchMessageItem } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface SearchMessageResultProps {
  item: MessagingSearchMessageItem;
  onOpen: (item: MessagingSearchMessageItem) => void;
}

/** A message found by « Rechercher dans la conversation » (MAIR-1164): author, date and excerpt, matches highlighted. */
export const SearchMessageResult = ({ item, onOpen }: SearchMessageResultProps) => (
  <button
    type="button"
    data-search-message-id={String(item.messageId)}
    className="flex w-full flex-col gap-1 rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-3 py-2 text-left hover:bg-[var(--mairie-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)]"
    onClick={() => onOpen(item)}
  >
    <span className="flex w-full items-baseline justify-between gap-2">
      <Text as="span" size="s" weight="semibold" truncate>{item.authorName ?? 'Ancien membre'}</Text>
      <DateTime value={item.createdAt} format="short" size="xs" tone="muted" />
    </span>
    <Text as="span" size="s" className="break-words">
      {highlightSegments(item.excerpt, item.highlights).map((segment, index) => segment.match
        ? <mark key={index} className="rounded-sm bg-[var(--mairie-accent-surface)] px-0.5 font-semibold text-[var(--mairie-text)]">{segment.text}</mark>
        : <React.Fragment key={index}>{segment.text}</React.Fragment>)}
    </Text>
  </button>
);
