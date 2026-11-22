import React from 'react';
import { MoreHorizontal, Trash, Users } from 'lucide-react';
import {
  ConfirmModal,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Icon,
  icons,
} from '@mairie360/lib-components/primitives';

import type { MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';
import { useMenuKeyboard } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/use-menu-keyboard';
import { HeaderIconButton } from '../HeaderIconButton';

export interface ConversationActionsMenuProps {
  conversation: MessagingConversation;
  label: string;
  deleteLabel: string;
  readPending: boolean;
  onMoreActions?: (conversation: MessagingConversation) => void;
  onDeleteConversation?: (conversation: MessagingConversation) => void;
  onReadVisibleMessages?: (conversation: MessagingConversation) => void;
  /** « Rechercher dans la conversation », shown only when given (MAIR-1164). */
  onSearch?: (conversation: MessagingConversation) => void;
  /** « Gérer les membres » of a group, shown only when given (MAIR-1165). */
  onManageMembers?: (conversation: MessagingConversation) => void;
  /** « Créer un groupe avec <personne> » of a direct conversation. */
  onCreateGroupWith?: (conversation: MessagingConversation) => void;
}

/**
 * « Plus d'actions » of the header (MAIR-1163, Figma F7 / F8): a lib `DropdownMenu` (keyboard layer of
 * `use-menu-keyboard.ts`, closed by Échap and an outside click). Direct: mark read, search, create a group with the
 * person; group: mark read, search, manage the members; then « Supprimer la conversation » (danger, separated),
 * confirmed by the lib `ConfirmModal`.
 */
export const ConversationActionsMenu = ({
  conversation, label, deleteLabel, readPending, onMoreActions, onDeleteConversation, onReadVisibleMessages,
  onSearch, onManageMembers, onCreateGroupWith,
}: ConversationActionsMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const { triggerProps, menuProps, itemProps } = useMenuKeyboard(open, setOpen);
  const group = conversation.kind === 'group';
  const readLabel = group ? 'Marquer comme lus' : 'Marquer les messages comme lus';
  const items = [
    onReadVisibleMessages && (
      <DropdownMenuItem key="read" {...itemProps(readPending)} disabled={readPending} onClick={() => onReadVisibleMessages(conversation)}>
        <Icon icon={icons['check-check']} size="s" />{readLabel}
      </DropdownMenuItem>
    ),
    onSearch && (
      <DropdownMenuItem key="search" {...itemProps()} onClick={() => onSearch(conversation)}>
        <Icon icon={icons['text-search']} size="s" />Rechercher dans la conversation
      </DropdownMenuItem>
    ),
    group && onManageMembers && (
      <DropdownMenuItem key="members" {...itemProps()} onClick={() => onManageMembers(conversation)}>
        <Icon icon={icons['users-round']} size="s" />Gérer les membres
      </DropdownMenuItem>
    ),
    !group && onCreateGroupWith && (
      <DropdownMenuItem key="group" {...itemProps()} onClick={() => onCreateGroupWith(conversation)}>
        <Icon icon={Users} size="s" />{`Créer un groupe avec ${conversation.name}`}
      </DropdownMenuItem>
    ),
  ].filter(Boolean);
  const hasMenu = items.length > 0 || !!onDeleteConversation;

  return (
    <>
      <DropdownMenu open={open && hasMenu} onOpenChange={setOpen}>
        <HeaderIconButton
          label={label}
          icon={MoreHorizontal}
          {...(hasMenu ? triggerProps : {})}
          expanded={hasMenu ? open : undefined}
          onClick={() => {
            if (hasMenu) setOpen(!open);
            onMoreActions?.(conversation);
          }}
        />
        <DropdownMenuContent align="end" className="w-64" {...menuProps(label)}>
          {items}
          {onDeleteConversation && (
            <>
              {items.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem {...itemProps()} variant="destructive" className={`${itemProps().className} hover:bg-[var(--mairie-error-surface)]`} onClick={() => setConfirming(true)}>
                <Icon icon={Trash} size="s" />{deleteLabel}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {onDeleteConversation && (
        <ConfirmModal
          open={confirming}
          role="alertdialog"
          title="Supprimer la conversation ?"
          message={`La conversation « ${conversation.name} » et ses messages seront supprimés. Cette action est définitive.`}
          confirmLabel="Supprimer"
          initialFocus="cancel"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onDeleteConversation(conversation);
          }}
        />
      )}
    </>
  );
};
