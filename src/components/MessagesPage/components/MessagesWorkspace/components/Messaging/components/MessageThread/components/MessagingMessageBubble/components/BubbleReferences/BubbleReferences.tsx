import { ArrowUpRight } from 'lucide-react';
import { Icon } from '@mairie360/lib-components/primitives';

import { BusinessReferenceIcon } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/BusinessReferenceIcon';
import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import type { MessagingBusinessReference } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

/** MAIR-1253 (Figma F2): the kind read before the title, « Tâche · Relire le dossier ». */
export const referenceKindLabels: Record<MessagingBusinessReference['kind'], string> = {
  project: 'Projet', task: 'Tâche', event: 'Événement', folder: 'Dossier', service: 'Service',
};

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
      ? 'border-[var(--mairie-message-own-border)] bg-[var(--mairie-surface)]/60 text-[var(--mairie-message-own-on)]'
      : 'border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] text-[var(--mairie-teal-text)]'
  );
  const actionableReferenceClassName = joinClasses(
    referenceClassName,
    outgoing ? 'hover:bg-[var(--mairie-surface)]' : 'hover:bg-[var(--mairie-accent-surface)]'
  );
  const content = (reference: MessagingBusinessReference, actionable: boolean) => (
    <>
      <BusinessReferenceIcon reference={reference} size="xs" className="shrink-0" />
      <span className="shrink-0 font-normal">{referenceKindLabels[reference.kind]} ·</span>{' '}
      <span className={joinClasses('min-w-0 truncate', actionable && 'underline underline-offset-2')}>{reference.title}</span>
      {actionable && <Icon icon={ArrowUpRight} size="xs" className="shrink-0" />}
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
            {content(reference, true)}
          </a>
        ) : onReferenceClick ? (
          <button key={reference.id} type="button" className={actionableReferenceClassName} onClick={() => onReferenceClick(reference)}>
            {content(reference, true)}
          </button>
        ) : (
          <span key={reference.id} className={referenceClassName}>{content(reference, false)}</span>
        )
      )}
    </div>
  );
};
