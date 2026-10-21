import { BusinessReferenceIcon, businessReferenceLabel } from '../business-reference';
import type { MessagingBusinessReference } from '../types';

export interface ContextReferenceBarProps {
  reference: MessagingBusinessReference;
  onOpen?: (reference: MessagingBusinessReference) => void;
}

/** The project, task or event a new message is attached to. */
export const ContextReferenceBar = ({ reference, onOpen }: ContextReferenceBarProps) => (
  <div
    aria-label="Message contextuel"
    className="flex items-center gap-3 border-t border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] px-4 py-3 text-sm text-[var(--mairie-teal-text)] sm:px-5"
  >
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--mairie-surface)] text-[var(--mairie-teal-text)]">
      <BusinessReferenceIcon reference={reference} className="size-4 shrink-0" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-semibold leading-5">Message contextuel</span>
      <span className="block truncate leading-5">
        {businessReferenceLabel(reference)} : {reference.title}
      </span>
    </span>
    {onOpen && (
      <button
        type="button"
        className="shrink-0 rounded-md px-2.5 py-1.5 font-semibold text-[var(--mairie-accent)] transition hover:bg-[var(--mairie-surface)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
        onClick={() => onOpen(reference)}
      >
        Ouvrir
      </button>
    )}
  </div>
);
