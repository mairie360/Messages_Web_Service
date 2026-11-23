import React from 'react';
import { Text, icons } from '@mairie360/lib-components/primitives';
import { Phone, Video } from 'lucide-react';

import { joinClasses } from '../../messaging-style';
import { ConversationActionsMenu } from './components/ConversationActionsMenu';
import { HeaderIconButton } from './components/HeaderIconButton';
import { HeaderMembers } from './components/HeaderMembers';
import { HeaderIdentity } from './components/HeaderIdentity';
import type { MessagingConversation, MessagingMember } from '../../messaging-types';

export interface MessagingChatHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  conversation?: MessagingConversation | null;
  callLabel?: string;
  videoCallLabel?: string;
  searchLabel?: string;
  moreActionsLabel?: string;
  deleteConversationLabel?: string;
  /** MAIR-1158: « Rechercher dans la conversation », shown only when given (MAIR-1164 wires it). */
  onSearchConversation?: (conversation: MessagingConversation) => void;
  onMoreActions?: (conversation: MessagingConversation) => void;
  onDeleteConversation?: (conversation: MessagingConversation) => void;
  onReadVisibleMessages?: (conversation: MessagingConversation) => void;
  /** MAIR-1163: « Gérer les membres » of a group (MAIR-1165 wires it). */
  onManageMembers?: (conversation: MessagingConversation) => void;
  /** MAIR-1163: « Créer un groupe avec <personne> » of a direct conversation. */
  onCreateGroupWith?: (conversation: MessagingConversation) => void;
  readPending?: boolean;
  /** MAIR-1165: members of the open group, for the avatar pile next to its name. */
  members?: MessagingMember[];
}

export const MessagingChatHeader = ({
  conversation,
  callLabel = 'Appeler',
  videoCallLabel = 'Lancer une visio',
  searchLabel = 'Rechercher dans la conversation',
  moreActionsLabel = "Plus d'actions",
  deleteConversationLabel = 'Supprimer la conversation',
  onSearchConversation,
  onMoreActions,
  onDeleteConversation,
  onReadVisibleMessages,
  onManageMembers,
  onCreateGroupWith,
  readPending = false,
  members,
  className = '',
  ...props
}: MessagingChatHeaderProps) => {
  if (!conversation) {
    return (
      <div
        className={joinClasses('flex min-h-[78px] items-center border-b border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4', className)}
        {...props}
      >
        <Text as="p" size="l" weight="semibold">Sélectionnez une conversation</Text>
      </div>
    );
  }

  return (
    <div
      className={joinClasses(
        'flex min-h-[78px] items-center justify-between gap-4 border-b border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4 text-[var(--mairie-text)] shadow-[var(--mairie-shadow)] sm:px-5',
        className
      )}
      {...props}
    >
      <HeaderIdentity conversation={conversation} />

      <div className="flex shrink-0 items-center gap-1.5">
        {conversation.kind === 'group' && onManageMembers && (members?.length || conversation.memberCount) ? (
          <HeaderMembers members={members ?? []} count={conversation.memberCount ?? members?.length} onManage={() => onManageMembers(conversation)} />
        ) : null}
        {/* MAIR-1158: calls are not available yet; the buttons are shown disabled with their tooltip. */}
        <HeaderIconButton label={callLabel} tooltip={`${callLabel} · bientôt disponible`} icon={Phone} unavailable />
        <HeaderIconButton label={videoCallLabel} tooltip={`${videoCallLabel} · bientôt disponible`} icon={Video} unavailable />
        {onSearchConversation && (
          <HeaderIconButton label={searchLabel} icon={icons['text-search']} onClick={() => onSearchConversation(conversation)} />
        )}
        {(onMoreActions || onDeleteConversation || onReadVisibleMessages || onSearchConversation || onManageMembers || onCreateGroupWith) && (
          <ConversationActionsMenu
            conversation={conversation}
            label={moreActionsLabel}
            deleteLabel={deleteConversationLabel}
            readPending={readPending}
            onMoreActions={onMoreActions}
            onDeleteConversation={onDeleteConversation}
            onReadVisibleMessages={onReadVisibleMessages}
            onSearch={onSearchConversation}
            onManageMembers={onManageMembers}
            onCreateGroupWith={onCreateGroupWith}
          />
        )}
      </div>
    </div>
  );
};
