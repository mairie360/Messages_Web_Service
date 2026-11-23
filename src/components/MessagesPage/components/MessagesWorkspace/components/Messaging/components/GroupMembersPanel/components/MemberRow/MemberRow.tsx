import React from 'react';
import { Avatar, Button, Tag, Text } from '@mairie360/lib-components/primitives';

import type { MessagingMember } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface MemberRowProps {
  member: MessagingMember;
  /** The agent's own line: « (vous) », never « Retirer ». */
  self: boolean;
  /** « Retirer » for the administrators of the group only. */
  onRemove?: (member: MessagingMember) => void;
  removing?: boolean;
}

/** A member of the group (MAIR-1165, Figma F11): name, service, « Administrateur » badge and « Retirer ». */
export const MemberRow = ({ member, self, onRemove, removing = false }: MemberRowProps) => (
  <div className="flex items-center gap-3 py-2">
    <Avatar alt={member.name} size="s" aria-hidden="true" />
    <span className="min-w-0 flex-1">
      <Text as="span" size="s" weight="semibold" truncate className="block">{member.name}{self ? ' (vous)' : ''}</Text>
      {member.department && <Text as="span" size="xs" tone="muted" truncate className="block">{member.department}</Text>}
    </span>
    {member.isAdmin && <Tag label="Administrateur" size="s" />}
    {onRemove && !self && (
      <Button variant="ghost" tone="danger" size="s" label="Retirer" aria-label={`Retirer ${member.name} du groupe`} loading={removing} onClick={() => onRemove(member)} />
    )}
  </div>
);
