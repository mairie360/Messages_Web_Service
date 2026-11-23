import React from 'react';
import { Avatar, Button, Text } from '@mairie360/lib-components/primitives';

import type { MessagingSearchPersonItem } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface SearchPersonResultProps {
  person: MessagingSearchPersonItem;
  /** « Écrire »: opens the direct conversation with the person; hidden without it (the agent itself). */
  onWrite?: (person: MessagingSearchPersonItem) => void;
}

/** A member found by « Rechercher dans la conversation » (MAIR-1164), with « Écrire » towards the direct conversation. */
export const SearchPersonResult = ({ person, onWrite }: SearchPersonResultProps) => (
  <div className="flex items-center gap-3 rounded-md border border-[var(--mairie-border)] px-3 py-2">
    <Avatar alt={person.name} size="s" aria-hidden="true" />
    <Text as="span" size="s" weight="semibold" truncate className="min-w-0 flex-1">{person.name}</Text>
    {onWrite && (
      <Button variant="outline" size="s" label="Écrire" aria-label={`Écrire à ${person.name}`} onClick={() => onWrite(person)} />
    )}
  </div>
);
