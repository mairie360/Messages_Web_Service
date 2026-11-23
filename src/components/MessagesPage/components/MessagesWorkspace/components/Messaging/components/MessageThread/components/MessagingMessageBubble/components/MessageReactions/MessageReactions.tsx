import React from 'react';
import { Button, IconButton, ToolTip, icons } from '@mairie360/lib-components/primitives';

import type { MessagingReaction } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface MessageReactionsProps {
  reactions: MessagingReaction[];
  outgoing: boolean;
  pending?: boolean;
  /** Adds or removes my reaction with this emoji. */
  onToggle?: (reaction: MessagingReaction) => void;
  /** « Ajouter une réaction »: opens the picker. */
  onAdd?: () => void;
}

/** « 👍 3, dont vous » — the accessible name of a reaction pill. */
export const reactionLabel = (reaction: MessagingReaction) =>
  `${reaction.emoji} ${reaction.count}${reaction.reactedByMe ? ', dont vous' : ''}`;

/** The tooltip of a pill: who reacted. */
export const reactionNames = (reaction: MessagingReaction) => {
  const names = reaction.userNames.filter(Boolean);
  if (names.length === 0) return reaction.count === 1 ? '1 agent' : `${reaction.count} agents`;
  const others = reaction.count - names.length;
  return others > 0 ? `${names.join(', ')} et ${others} autre${others > 1 ? 's' : ''}` : names.join(', ');
};

/**
 * MAIR-1170 (Figma F16): one pill per emoji under the bubble, a toggle button (`aria-pressed`, « 👍 3, dont vous »)
 * with the names in its lib `ToolTip`; mine is highlighted. « Ajouter une réaction » opens the picker.
 */
export const MessageReactions = ({ reactions, outgoing, pending = false, onToggle, onAdd }: MessageReactionsProps) => {
  if (reactions.length === 0) return null;
  return (
    <div data-message-reactions="" className={`mt-1 flex flex-wrap items-center gap-1 ${outgoing ? 'justify-end self-end' : ''}`}>
      {reactions.map(reaction => (
        <ToolTip key={reaction.emoji} text={reactionNames(reaction)}>
          <Button
            variant="outline"
            size="xs"
            tone={reaction.reactedByMe ? 'primary' : 'neutral'}
            aria-pressed={reaction.reactedByMe}
            aria-label={reactionLabel(reaction)}
            disabled={pending || !onToggle}
            className={reaction.reactedByMe ? 'bg-[var(--mairie-accent-surface)]' : undefined}
            onClick={() => onToggle?.(reaction)}
          >
            <span aria-hidden="true">{reaction.emoji} {reaction.count}</span>
          </Button>
        </ToolTip>
      ))}
      {onAdd && (
        <ToolTip text="Ajouter une réaction">
          <IconButton icon={icons['smile-plus']} label="Ajouter une réaction" title="" size="xs" disabled={pending} onClick={onAdd} />
        </ToolTip>
      )}
    </div>
  );
};
