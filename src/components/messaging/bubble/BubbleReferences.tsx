import { BusinessReferenceIcon } from '../business-reference';
import { joinClasses } from '../style';
import type { MessagingBusinessReference } from '../types';

export interface BubbleReferencesProps {
  references: MessagingBusinessReference[];
  outgoing: boolean;
  onReferenceClick?: (reference: MessagingBusinessReference) => void;
}

/** Linked projects, tasks and events: a link when they have an address, a button when clickable. */
export const BubbleReferences = ({ references, outgoing, onReferenceClick }: BubbleReferencesProps) => {
  if (references.length === 0) return null;
  const referenceClassName = joinClasses(
    'inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition',
    outgoing
      ? 'border-[var(--mairie-surface)]/35 bg-[var(--mairie-surface)]/10 text-[var(--mairie-on-action)]'
      : 'border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] text-[var(--mairie-teal-text)]'
  );
  const actionableReferenceClassName = joinClasses(
    referenceClassName,
    outgoing ? 'hover:bg-[var(--mairie-surface)]/15' : 'hover:bg-[var(--mairie-accent-surface)]'
  );
  const content = (reference: MessagingBusinessReference) => (
    <>
      <BusinessReferenceIcon reference={reference} className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{reference.title}</span>
    </>
  );

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {references.map((reference) =>
        reference.href ? (
          <a
            key={reference.id}
            href={reference.href}
            className={actionableReferenceClassName}
            onClick={onReferenceClick ? () => onReferenceClick(reference) : undefined}
          >
            {content(reference)}
          </a>
        ) : onReferenceClick ? (
          <button key={reference.id} type="button" className={actionableReferenceClassName} onClick={() => onReferenceClick(reference)}>
            {content(reference)}
          </button>
        ) : (
          <span key={reference.id} className={referenceClassName}>{content(reference)}</span>
        )
      )}
    </div>
  );
};
