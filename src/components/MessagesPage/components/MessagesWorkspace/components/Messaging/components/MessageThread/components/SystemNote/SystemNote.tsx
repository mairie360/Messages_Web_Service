import React from 'react';
import { Text } from '@mairie360/lib-components/primitives';

import { systemNoteText } from './system-note-text';
import type { MessagingContactId, MessagingMessage } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface SystemNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  message: MessagingMessage;
  currentUserId?: MessagingContactId;
}

/** MAIR-1165 (Figma F11): a membership change, centred in the thread between the bubbles. */
export const SystemNote = ({ message, currentUserId, ...props }: SystemNoteProps) => (
  <div {...props} data-system-note="" className="flex justify-center">
    <Text as="p" size="xs" tone="muted" className="rounded-full bg-[var(--mairie-surface-raised)] px-3 py-1 text-center">
      {message.systemEvent ? systemNoteText(message.systemEvent, currentUserId) : 'La conversation a changé.'}
      {message.sentAt && <span className="sr-only"> ({message.sentAt})</span>}
    </Text>
  </div>
);
