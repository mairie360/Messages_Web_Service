import { Calendar } from 'lucide-react';
import { Icon, icons } from '@mairie360/lib-components/primitives';
import type { Size } from '@mairie360/lib-components/theme';

import type { MessagingBusinessReference } from '../../messaging-types';

/** Short kind label shown next to a linked project, task, folder, event or service. */
export const businessReferenceLabel = (reference: Pick<MessagingBusinessReference, 'kind'>) => {
  if (reference.kind === 'event') return 'Événement';
  if (reference.kind === 'task') return 'Tâche';
  if (reference.kind === 'folder') return 'Dossier';
  if (reference.kind === 'service') return 'Service';

  return 'Projet';
};

/** Longer kind label used in the composer suggestions. */
export const businessReferenceKindLabel = (reference: Pick<MessagingBusinessReference, 'kind'>) =>
  reference.kind === 'event' ? 'Événement du calendrier' : businessReferenceLabel(reference);

/** MAIR-1158: explicit glyph per kind (folder-kanban, list-checks, folder-open, calendar, building-2). */
export const businessReferenceGlyph = (reference: Pick<MessagingBusinessReference, 'kind'>) => {
  if (reference.kind === 'event') return Calendar;
  if (reference.kind === 'task') return icons['list-checks'];
  if (reference.kind === 'folder') return icons['folder-open'];
  if (reference.kind === 'service') return icons['building-2'];

  return icons['folder-kanban'];
};

/** Kind icon through the lib `Icon` (decorative: the kind is written next to it). */
export const BusinessReferenceIcon = ({ reference, size = 's', className }: {
  reference: Pick<MessagingBusinessReference, 'kind'>; size?: Size; className?: string;
}) => <Icon icon={businessReferenceGlyph(reference)} size={size} className={className} />;
