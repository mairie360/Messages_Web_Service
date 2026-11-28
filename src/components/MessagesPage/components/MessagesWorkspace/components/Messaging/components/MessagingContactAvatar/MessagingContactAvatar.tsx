import React from 'react';
import { Avatar, Icon, icons, initialsOf } from '@mairie360/lib-components/primitives';

import { joinClasses } from '../../messaging-style';
import type { MessagingPresence } from '../../messaging-types';

export interface MessagingContactAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  initials?: string;
  presence?: MessagingPresence;
  size?: 'sm' | 'md' | 'lg';
  /** MAIR-1253: a group conversation shows the artifact's « users » icon on a raised disc, never initials. */
  group?: boolean;
}

/** Lib avatar scale (MAIR-1157): 32 / 40 / 40 px. */
const avatarSizes = { sm: 'm', md: 'l', lg: 'l' } as const;

const presenceClasses: Record<MessagingPresence, string> = {
  online: 'bg-[var(--mairie-presence-online)]',
  away: 'bg-[var(--mairie-presence-away)]',
  offline: 'bg-[var(--mairie-presence-offline)]',
};

/** Initials of a person or of a group (« Conseil municipal » → « CM »). */
const getInitials = (name: string, initials?: string) => initials || initialsOf(name);

export const MessagingContactAvatar = ({
  name,
  src,
  initials,
  presence,
  size = 'md',
  group = false,
  className = '',
  ...props
}: MessagingContactAvatarProps) => (
  <div className={joinClasses('relative shrink-0', className)} {...props}>
    {/* The name gives the initials their stable lib colour; the name is written next to the avatar, so initials
        without a photo are hidden from assistive technologies instead of being announced twice. */}
    {group && !src ? (
      <span
        aria-hidden="true"
        data-group-avatar=""
        className="flex items-center justify-center rounded-full border border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] text-[var(--mairie-text)]"
        style={{ width: `var(--mairie-avatar-${avatarSizes[size]})`, height: `var(--mairie-avatar-${avatarSizes[size]})` }}
      >
        <Icon icon={icons['users-round']} size="s" />
      </span>
    ) : (
      <Avatar src={src} alt={name} aria-hidden={src ? undefined : true} fallback={getInitials(name, initials)} size={avatarSizes[size]} />
    )}
    {presence && (
      <span
        role="img"
        aria-label={presence === 'online' ? 'En ligne' : presence === 'away' ? 'Absent' : 'Hors ligne'}
        className={joinClasses(
          'absolute bottom-0 right-0 block size-3 rounded-full border-2 border-[var(--mairie-surface)]',
          presenceClasses[presence]
        )}
      />
    )}
  </div>
);
