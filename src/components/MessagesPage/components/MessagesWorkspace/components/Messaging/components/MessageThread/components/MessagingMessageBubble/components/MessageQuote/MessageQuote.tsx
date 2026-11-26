import React from 'react';
import { Icon, Text, icons } from '@mairie360/lib-components/primitives';

export interface MessageQuoteProps {
  authorName?: string;
  excerpt?: string;
  /** The quoted message was deleted: « Message supprimé ». */
  deleted?: boolean;
  outgoing: boolean;
  /** Scroll to the quoted message (absent when it is gone). */
  onOpen?: () => void;
}

/** MAIR-1167 (Figma F13): the message a reply quotes, above its bubble; a click scrolls to the original. */
export const MessageQuote = ({ authorName, excerpt, deleted = false, outgoing, onOpen }: MessageQuoteProps) => {
  const content = (
    <>
      <Icon icon={icons['corner-up-left']} size="xs" className="mt-0.5 shrink-0 text-[var(--mairie-muted)]" />
      <span className="min-w-0">
        {!deleted && authorName && <Text as="span" size="xs" weight="semibold" className="block truncate">{authorName}</Text>}
        <Text as="span" size="xs" tone="muted" className={`block truncate ${deleted ? 'italic' : ''}`}>{deleted ? 'Message supprimé' : excerpt || 'Message cité'}</Text>
      </span>
    </>
  );
  const className = `mb-1 flex max-w-[min(480px,75%)] items-start gap-1.5 rounded-md border-l-2 border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] px-2 py-1 text-left ${outgoing ? 'mr-1 self-end' : 'ml-1'}`;
  return onOpen && !deleted ? (
    <button type="button" data-message-quote="" className={`${className} hover:border-[var(--mairie-accent)]`} aria-label={`Voir le message cité${authorName ? ` de ${authorName}` : ''}`} onClick={onOpen}>
      {content}
    </button>
  ) : <div data-message-quote="" className={className}>{content}</div>;
};
