import React from 'react';
import { PageTitle } from '@mairie360/lib-components/primitives';

import { NewConversationMenu } from './components/NewConversationMenu';

export interface SidebarHeaderProps {
  title: React.ReactNode;
  newConversationLabel?: string;
  newMessageLabel: string;
  createGroupLabel: string;
  onNewMessageClick?: () => void;
  onCreateGroupClick?: () => void;
}

/**
 * Title of the list, the page h1 (MAIR-1156), and the single « + » entry point to start a conversation
 * (MAIR-1157): a menu with « Nouveau message » and « Créer un groupe ».
 */
export const SidebarHeader = ({
  title, newConversationLabel = 'Nouvelle conversation', newMessageLabel, createGroupLabel, onNewMessageClick, onCreateGroupClick,
}: SidebarHeaderProps) => (
  <div className="flex min-w-0 items-center justify-between gap-3">
    <PageTitle size="l" truncate className="min-w-0">{title}</PageTitle>
    {(onNewMessageClick || onCreateGroupClick) && (
      <NewConversationMenu
        label={newConversationLabel}
        newMessageLabel={newMessageLabel}
        createGroupLabel={createGroupLabel}
        onNewMessageClick={onNewMessageClick}
        onCreateGroupClick={onCreateGroupClick}
      />
    )}
  </div>
);
