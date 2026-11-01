import { FileText, X } from 'lucide-react';

import type { MessagingAttachment } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface ComposerAttachmentChipsProps {
  attachments: MessagingAttachment[];
  disabled: boolean;
  onRemove: (attachmentId: MessagingAttachment['id']) => void;
}

/** Files waiting in the draft, each removable before sending. */
export const ComposerAttachmentChips = ({ attachments, disabled, onRemove }: ComposerAttachmentChipsProps) => {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <span
          key={attachment.id}
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] px-2.5 py-1.5 text-xs font-semibold text-[var(--mairie-text)]"
        >
          <FileText className="size-3.5 shrink-0" strokeWidth={1.8} />
          <span className="max-w-[180px] truncate">{attachment.name}</span>
          <button
            type="button"
            aria-label={`Retirer ${attachment.name}`}
            disabled={disabled}
            className="inline-flex size-5 items-center justify-center rounded text-[var(--mairie-muted)] transition hover:bg-[var(--mairie-surface-raised)] hover:text-[var(--mairie-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
            onClick={() => onRemove(attachment.id)}
          >
            <X className="size-3.5" strokeWidth={1.8} />
          </button>
        </span>
      ))}
    </div>
  );
};
