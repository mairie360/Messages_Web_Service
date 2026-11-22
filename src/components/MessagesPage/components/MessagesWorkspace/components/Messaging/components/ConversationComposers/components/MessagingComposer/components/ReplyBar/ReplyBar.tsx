import React from 'react';
import { CloseIconButton, Icon, Text, icons } from '@mairie360/lib-components/primitives';

export interface ReplyBarProps {
  authorName?: string;
  excerpt: string;
  onCancel: () => void;
}

/** MAIR-1167 (Figma F13): the message being answered, above the text field, with « Annuler la réponse ». */
export const ReplyBar = ({ authorName, excerpt, onCancel }: ReplyBarProps) => (
  <div role="status" className="mb-2 flex items-center gap-2 rounded-md border-l-2 border-[var(--mairie-accent)] bg-[var(--mairie-surface-raised)] px-3 py-1.5">
    <Icon icon={icons['corner-up-left']} size="s" className="shrink-0 text-[var(--mairie-accent)]" />
    <span className="min-w-0 flex-1">
      <Text as="span" size="xs" weight="semibold" className="block truncate">{`Réponse à ${authorName ?? 'un message'}`}</Text>
      <Text as="span" size="xs" tone="muted" className="block truncate">{excerpt}</Text>
    </span>
    <CloseIconButton label="Annuler la réponse" size="s" onClick={onCancel} />
  </div>
);
