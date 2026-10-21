import React from 'react';

import { joinClasses } from '../../messaging-style';
import type { MessagingPresence } from '../../messaging-types';

export interface MessagingContactAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  initials?: string;
  presence?: MessagingPresence;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'size-9 text-sm',
  md: 'size-11 text-base',
  lg: 'size-12 text-base',
};

const presenceClasses: Record<MessagingPresence, string> = {
  online: 'bg-[var(--mairie-presence-online)]',
  away: 'bg-[var(--mairie-presence-away)]',
  offline: 'bg-[var(--mairie-presence-offline)]',
};

const getInitials = (name: string, initials?: string) => {
  if (initials) return initials;

  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const MessagingContactAvatar = ({
  name,
  src,
  initials,
  presence,
  size = 'md',
  className = '',
  ...props
}: MessagingContactAvatarProps) => (
  <div className={joinClasses('relative shrink-0', className)} {...props}>
    <div
      className={joinClasses(
        'flex items-center justify-center overflow-hidden rounded-full bg-[var(--mairie-action-background)] font-semibold leading-none text-[var(--mairie-on-action)] ring-2 ring-[var(--mairie-surface)]',
        sizeClasses[size]
      )}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span>{getInitials(name, initials)}</span>
      )}
    </div>
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
