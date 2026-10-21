import { FileText } from 'lucide-react';

import { joinClasses } from '../style';
import type { MessagingAttachment } from '../types';

export interface BubbleAttachmentsProps {
  attachments: MessagingAttachment[];
  outgoing: boolean;
  downloadPending: boolean;
  /** When set, files are fetched through the BFF instead of a direct link. */
  onDownload?: (attachment: MessagingAttachment) => void;
}

/** Files of a message: a download button, a direct link or a plain label. */
export const BubbleAttachments = ({ attachments, outgoing, downloadPending, onDownload }: BubbleAttachmentsProps) => {
  if (attachments.length === 0) return null;
  const attachmentClassName = joinClasses(
    'flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition',
    outgoing ? 'border-[var(--mairie-surface)]/35 bg-[var(--mairie-surface)]/10 text-[var(--mairie-on-action)]' : 'border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] text-[var(--mairie-text)]'
  );

  return (
    <div className="mt-3 space-y-2">
      {attachments.map((attachment) =>
        onDownload ? (
          <button key={attachment.id} type="button" className={attachmentClassName} disabled={downloadPending} onClick={() => onDownload(attachment)}>
            <FileText className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{attachment.name}</span>
            <span>{downloadPending ? 'Téléchargement…' : 'Télécharger'}</span>
          </button>
        ) : attachment.url ? (
          <a
            key={attachment.id}
            href={attachment.url}
            download={attachment.name}
            target="_blank"
            rel="noreferrer"
            className={joinClasses(attachmentClassName, outgoing ? 'hover:bg-[var(--mairie-surface)]/15' : 'hover:bg-[var(--mairie-background)]')}
          >
            <FileText className="size-4 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 truncate">{attachment.name}</span>
          </a>
        ) : (
          <div key={attachment.id} className={attachmentClassName}>
            <FileText className="size-4 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 truncate">{attachment.name}</span>
          </div>
        )
      )}
    </div>
  );
};
