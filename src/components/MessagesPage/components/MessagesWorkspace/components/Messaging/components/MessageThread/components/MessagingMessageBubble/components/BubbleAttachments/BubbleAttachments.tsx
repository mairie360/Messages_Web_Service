import { Download, FileText } from 'lucide-react';
import { Icon } from '@mairie360/lib-components/primitives';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import type { MessagingAttachment } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

/** « 2,4 Mo » under the file name (Figma F2); nothing when the BFF gives no size. */
export const formatAttachmentSize = (size?: number) => {
  if (size === undefined || !Number.isFinite(size) || size < 0) return undefined;
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: unit ? 1 : 0 }).format(value)} ${units[unit]}`;
};

export interface BubbleAttachmentsProps {
  attachments: MessagingAttachment[];
  outgoing: boolean;
  downloadPending: boolean;
  /** When set, files are fetched through the BFF instead of a direct link. */
  onDownload?: (attachment: MessagingAttachment) => void;
}

/** The file chip, name and size, of one attachment. */
const FileLabel = ({ attachment }: { attachment: MessagingAttachment }) => {
  const size = formatAttachmentSize(attachment.size);
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--mairie-surface-raised)]">
        <Icon icon={FileText} size="s" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{attachment.name}</span>
        {size && <span className="text-xs font-normal opacity-80">{size}</span>}
      </span>
    </>
  );
};

/** Files of a message: a download button, a direct link or a plain label. */
export const BubbleAttachments = ({ attachments, outgoing, downloadPending, onDownload }: BubbleAttachmentsProps) => {
  if (attachments.length === 0) return null;
  const attachmentClassName = joinClasses(
    'flex w-full max-w-sm items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition',
    outgoing ? 'border-[var(--mairie-message-own-border)] bg-[var(--mairie-surface)]/60 text-[var(--mairie-message-own-on)]' : 'border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] text-[var(--mairie-text)]'
  );

  return (
    <div className="mt-3 space-y-2">
      {attachments.map((attachment) =>
        onDownload ? (
          <button key={attachment.id} type="button" className={attachmentClassName} disabled={downloadPending} onClick={() => onDownload(attachment)}>
            <FileLabel attachment={attachment} />
            {downloadPending ? <span className="text-xs">Téléchargement…</span> : <><Icon icon={Download} size="s" className="shrink-0" /><span className="sr-only">Télécharger</span></>}
          </button>
        ) : attachment.url ? (
          <a
            key={attachment.id}
            href={attachment.url}
            download={attachment.name}
            target="_blank"
            rel="noreferrer"
            className={joinClasses(attachmentClassName, outgoing ? 'hover:bg-[var(--mairie-surface)]' : 'hover:bg-[var(--mairie-background)]')}
          >
            <FileLabel attachment={attachment} />
            <Icon icon={Download} size="s" className="shrink-0" />
          </a>
        ) : (
          <div key={attachment.id} className={attachmentClassName}>
            <FileLabel attachment={attachment} />
          </div>
        )
      )}
    </div>
  );
};
