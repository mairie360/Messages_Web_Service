import React from 'react';
import { AvatarGroup, ToolTip } from '@mairie360/lib-components/primitives';

import type { MessagingMember } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface HeaderMembersProps {
  /** The members known so far (a sample is enough for the avatars). */
  members: MessagingMember[];
  /** The number of members of the group; the known members when absent. */
  count?: number;
  onManage: () => void;
}

/** MAIR-1165 (Figma F11): the avatar pile of a group and its size, one button « N membres, gérer les membres ». */
export const HeaderMembers = ({ members, count, onManage }: HeaderMembersProps) => {
  const total = count ?? members.length;
  return (
    <ToolTip text="Gérer les membres">
      <AvatarGroup
        people={members.map(member => ({ name: member.name }))}
        count={total}
        max={3}
        size="s"
        label={`${total === 1 ? '1 membre' : `${total} membres`}, gérer les membres`}
        onClick={onManage}
      />
    </ToolTip>
  );
};
