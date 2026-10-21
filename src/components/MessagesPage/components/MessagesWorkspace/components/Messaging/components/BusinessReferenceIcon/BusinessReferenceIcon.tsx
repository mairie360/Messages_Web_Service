import { Briefcase, CalendarDays, ListTodo } from 'lucide-react';

import type { MessagingBusinessReference } from '../../messaging-types';

/** Short kind label shown next to a linked project, task or event. */
export const businessReferenceLabel = (reference: MessagingBusinessReference) => {
  if (reference.kind === 'event') return 'Événement';
  if (reference.kind === 'task') return 'Tâche';

  return 'Projet';
};

/** Longer kind label used in the composer suggestions. */
export const businessReferenceKindLabel = (reference: MessagingBusinessReference) =>
  reference.kind === 'event' ? 'Événement du calendrier' : businessReferenceLabel(reference);

/** Kind icon; `className` replaces the default 16px size. */
export const BusinessReferenceIcon = ({ reference, className }: { reference: MessagingBusinessReference; className?: string }) => {
  const iconClassName = className ?? 'size-4';
  if (reference.kind === 'event') return <CalendarDays className={iconClassName} strokeWidth={1.8} />;
  if (reference.kind === 'task') return <ListTodo className={iconClassName} strokeWidth={1.8} />;

  return <Briefcase className={iconClassName} strokeWidth={1.8} />;
};
