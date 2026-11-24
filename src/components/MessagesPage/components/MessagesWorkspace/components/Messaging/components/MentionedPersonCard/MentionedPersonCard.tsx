import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button, Modal, Text } from '@mairie360/lib-components/primitives';

import { MessagingContactAvatar } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MessagingContactAvatar';
import type { MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

const presenceLabel = { online: 'En ligne', away: 'Absent', offline: 'Hors ligne' } as const;

export interface MentionedPersonCardProps {
  /** The person a `@mention` of a message names; their department, presence and photo come from the contacts. */
  person: Pick<MessagingConversation, 'id' | 'name' | 'department' | 'presence' | 'avatarUrl' | 'initials'>;
  /** The agent themself: no « Écrire » on their own card. */
  isCurrentUser?: boolean;
  /** « Écrire »: opens the direct conversation with the person, or a new message to them. Hidden when absent. */
  onWrite?: () => void;
  onClose: () => void;
}

/** Card of the agent a `@mention` names (Messaging mockup « Fiche d'un agent mentionné »): who they are, and write to them. */
export const MentionedPersonCard = ({ person, isCurrentUser = false, onWrite, onClose }: MentionedPersonCardProps) => {
  const meta = [person.department, person.presence ? presenceLabel[person.presence] : undefined].filter(Boolean).join(' · ');
  return (
    <Modal
      open
      size="xs"
      title={(
        <span className="flex items-center gap-3">
          <MessagingContactAvatar name={person.name} src={person.avatarUrl} initials={person.initials} presence={person.presence} size="lg" />
          <span>{person.name}{isCurrentUser ? ' (vous)' : ''}</span>
        </span>
      )}
      description={meta || undefined}
      closeLabel="Fermer"
      onClose={onClose}
      footer={!isCurrentUser && onWrite
        ? <Button label="Écrire" icon={MessageSquarePlus} aria-label={`Écrire à ${person.name}`} onClick={onWrite} />
        : undefined}
    >
      {!meta && <Text as="p" tone="muted" size="s">Aucune information complémentaire.</Text>}
    </Modal>
  );
};
