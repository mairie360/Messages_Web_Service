import { AtSign } from 'lucide-react';

import { BusinessReferenceIcon, businessReferenceKindLabel } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/BusinessReferenceIcon';
import type { MessagingBusinessReference, MessagingMention } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

const suggestionClassName = 'flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-left transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30';

export const MentionSuggestion = ({ mention, disabled, onSelect }: {
  mention: MessagingMention; disabled: boolean; onSelect: (mention: MessagingMention) => void;
}) => (
  <button type="button" disabled={disabled} className={suggestionClassName} onClick={() => onSelect(mention)}>
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--mairie-action-background)] text-[var(--mairie-on-action)]">
      <AtSign className="size-4" strokeWidth={1.8} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate font-semibold">@{mention.name}</span>
      <span className="block truncate text-xs text-[var(--mairie-muted)]">
        {mention.kind === 'group' ? 'Groupe' : mention.description || 'Contact'}
      </span>
    </span>
  </button>
);

export const BusinessReferenceSuggestion = ({ reference, disabled, onSelect }: {
  reference: MessagingBusinessReference; disabled: boolean; onSelect: (reference: MessagingBusinessReference) => void;
}) => (
  <button type="button" title={reference.title} disabled={disabled} className={suggestionClassName} onClick={() => onSelect(reference)}>
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--mairie-success-action-background)] text-[var(--mairie-on-action)]">
      <BusinessReferenceIcon reference={reference} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate font-semibold">#{reference.title}</span>
      <span className="block truncate text-xs text-[var(--mairie-muted)]">
        {businessReferenceKindLabel(reference)}
        {reference.description ? ` · ${reference.description}` : ''}
      </span>
    </span>
  </button>
);

export interface ComposerSuggestionsProps {
  mentions: MessagingMention[];
  businessReferences: MessagingBusinessReference[];
  disabled: boolean;
  onSelectMention: (mention: MessagingMention) => void;
  onSelectBusinessReference: (reference: MessagingBusinessReference) => void;
}

/** Popover above the input; mentions win over business references. */
export const ComposerSuggestions = ({ mentions, businessReferences, disabled, onSelectMention, onSelectBusinessReference }: ComposerSuggestionsProps) => {
  if (mentions.length === 0 && businessReferences.length === 0) return null;
  return (
    <div className="absolute bottom-[calc(100%+8px)] left-0 z-30 max-h-72 w-full max-w-[440px] overflow-y-auto rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-1 text-sm text-[var(--mairie-text)] shadow-lg">
      {mentions.length > 0
        ? mentions.map((mention) => <MentionSuggestion key={mention.id} mention={mention} disabled={disabled} onSelect={onSelectMention} />)
        : businessReferences.map((reference) => <BusinessReferenceSuggestion key={reference.id} reference={reference} disabled={disabled} onSelect={onSelectBusinessReference} />)}
    </div>
  );
};
