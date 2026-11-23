import React from 'react';
import { Pencil, Trash } from 'lucide-react';
import { IconButton, ToolTip, icons } from '@mairie360/lib-components/primitives';

export interface MessageActionsToolbarProps {
  /** Shown on hover, on keyboard focus of the bubble and after a long press (mobile). */
  open?: boolean;
  outgoing: boolean;
  onReact?: () => void;
  onReply?: () => void;
  /** Mine only (MAIR-1168, MAIR-1169). */
  onEdit?: () => void;
  onDelete?: () => void;
}

const ToolbarButton = ({ label, icon, onClick, tone }: { label: string; icon: React.ComponentProps<typeof IconButton>['icon']; onClick: () => void; tone?: 'danger' }) => (
  <ToolTip text={label}>
    <IconButton icon={icon} label={label} title="" size="s" tone={tone} onClick={onClick} />
  </ToolTip>
);

/**
 * MAIR-1167 (Figma F13): the actions of a message — Réagir, Répondre, and for my messages Modifier and Supprimer —
 * as lib `IconButton`s with their `ToolTip`, in a `role="toolbar"` that appears with the hover or the focus of the
 * bubble. Nothing is rendered without action.
 */
export const MessageActionsToolbar = ({ open = false, outgoing, onReact, onReply, onEdit, onDelete }: MessageActionsToolbarProps) => {
  if (!onReact && !onReply && !(outgoing && (onEdit || onDelete))) return null;
  return (
    <div
      role="toolbar"
      aria-label="Actions du message"
      data-open={open || undefined}
      className={`flex gap-0.5 rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-0.5 shadow-[var(--mairie-shadow)] opacity-0 transition-opacity group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100 data-[open]:opacity-100 ${outgoing ? 'mr-1 self-end' : 'ml-1'}`}
    >
      {onReact && <ToolbarButton label="Réagir" icon={icons['smile-plus']} onClick={onReact} />}
      {onReply && <ToolbarButton label="Répondre" icon={icons['corner-up-left']} onClick={onReply} />}
      {outgoing && onEdit && <ToolbarButton label="Modifier" icon={Pencil} onClick={onEdit} />}
      {outgoing && onDelete && <ToolbarButton label="Supprimer" icon={Trash} onClick={onDelete} tone="danger" />}
    </div>
  );
};
