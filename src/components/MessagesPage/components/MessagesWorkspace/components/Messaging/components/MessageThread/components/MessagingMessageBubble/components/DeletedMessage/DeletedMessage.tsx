import React from 'react';
import { Ban } from 'lucide-react';
import { Icon, Text } from '@mairie360/lib-components/primitives';

/** MAIR-1169 (Figma F15): a deleted message, in place of its bubble; no action is possible on it any more. */
export const DeletedMessage = ({ outgoing }: { outgoing: boolean }) => (
  <div
    data-deleted-message=""
    className={`flex items-center gap-1.5 rounded-md border border-dashed border-[var(--mairie-border)] px-3 py-2 ${outgoing ? 'self-end' : ''}`}
  >
    <Icon icon={Ban} size="s" className="text-[var(--mairie-muted)]" />
    <Text as="span" size="s" tone="muted" className="italic">Message supprimé</Text>
  </div>
);
