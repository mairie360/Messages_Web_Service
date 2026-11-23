import React from 'react';
import { MessageSquare, UsersRound } from 'lucide-react';
import { PageTitle } from '@mairie360/lib-components/primitives';

const SidebarActionButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] text-[var(--mairie-text)] transition hover:bg-[var(--mairie-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
    onClick={onClick}
  >
    {children}
  </button>
);

export interface SidebarHeaderProps {
  title: React.ReactNode;
  newMessageLabel: string;
  createGroupLabel: string;
  onNewMessageClick?: () => void;
  onCreateGroupClick?: () => void;
}

/** Module title (the page h1 since MAIR-1156: no title above the module) with the "new message" and "create group" shortcuts. */
export const SidebarHeader = ({ title, newMessageLabel, createGroupLabel, onNewMessageClick, onCreateGroupClick }: SidebarHeaderProps) => (
  <div className="flex items-center justify-between gap-3">
    <PageTitle size="l" truncate>{title}</PageTitle>
    {(onNewMessageClick || onCreateGroupClick) && (
      <div className="flex shrink-0 gap-1.5">
        {onNewMessageClick && (
          <SidebarActionButton label={newMessageLabel} onClick={onNewMessageClick}>
            <MessageSquare className="size-4" strokeWidth={1.8} />
          </SidebarActionButton>
        )}
        {onCreateGroupClick && (
          <SidebarActionButton label={createGroupLabel} onClick={onCreateGroupClick}>
            <UsersRound className="size-4" strokeWidth={1.8} />
          </SidebarActionButton>
        )}
      </div>
    )}
  </div>
);
