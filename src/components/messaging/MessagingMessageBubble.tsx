import React from 'react';
import { Briefcase, CalendarDays, FileText, ListTodo } from 'lucide-react';

import { joinClasses } from './style';
import type {
  MessagingAttachment,
  MessagingBusinessReference,
  MessagingMention,
  MessagingMessage,
} from './types';

export interface MessagingMessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: MessagingMessage;
  mentionOptions?: MessagingMention[];
  businessReferenceOptions?: MessagingBusinessReference[];
  onAttachmentDownload?: (attachment: MessagingAttachment, message: MessagingMessage) => Promise<void>;
  onBusinessReferenceClick?: (reference: MessagingBusinessReference) => void;
}

type InlineMentionKind = 'user' | 'business';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderMentionedContent = (
  content: React.ReactNode,
  mentions: MessagingMention[],
  businessReferences: MessagingBusinessReference[]
) => {
  if (typeof content !== 'string') return content;

  const mentionKinds = new Map<string, InlineMentionKind>();

  mentions.forEach((mention) => {
    const label = `@${mention.name}`;
    if (mention.name.trim() && content.includes(label)) mentionKinds.set(label, 'user');
  });
  businessReferences.forEach((reference) => {
    const label = `#${reference.title}`;
    if (reference.title.trim() && content.includes(label)) mentionKinds.set(label, 'business');
  });

  if (mentionKinds.size === 0) return content;

  const mentionPattern = Array.from(mentionKinds.keys())
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');
  const parts = content.split(new RegExp(`(${mentionPattern})(?![\\p{L}\\p{N}_])`, 'gu'));

  return parts.map((part, index) => {
    const mentionKind = mentionKinds.get(part);

    if (!mentionKind) return part;

    return (
      <strong
        key={`${part}-${index}`}
        className="font-bold underline underline-offset-2"
        data-mention-kind={mentionKind}
      >
        {part}
      </strong>
    );
  });
};

export const MessagingMessageBubble = ({
  message,
  mentionOptions = [],
  businessReferenceOptions = [],
  onBusinessReferenceClick,
  onAttachmentDownload,
  className = '',
  ...props
}: MessagingMessageBubbleProps) => {
  const [downloadError, setDownloadError] = React.useState('');
  const [downloadPending, setDownloadPending] = React.useState(false);
  const downloadRef = React.useRef(false);
  const outgoing = message.direction === 'outgoing';
  const hasAttachments = !!message.attachments?.length;
  const businessReferences = [message.context, ...(message.businessLinks ?? [])].filter(
    (reference, index, references): reference is MessagingBusinessReference =>
      !!reference && references.findIndex((currentReference) => currentReference?.id === reference.id) === index
  );
  const hasBusinessReferences = businessReferences.length > 0;
  const mentionedContent = renderMentionedContent(
    message.content,
    [...mentionOptions, ...(message.mentions ?? [])],
    [...businessReferenceOptions, ...businessReferences]
  );

  const getBusinessReferenceIcon = (reference: MessagingBusinessReference) => {
    if (reference.kind === 'event') return <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.8} />;
    if (reference.kind === 'task') return <ListTodo className="size-3.5 shrink-0" strokeWidth={1.8} />;

    return <Briefcase className="size-3.5 shrink-0" strokeWidth={1.8} />;
  };

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
  const attachmentClassName = joinClasses(
    'flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition',
    outgoing ? 'border-[var(--mairie-surface)]/35 bg-[var(--mairie-surface)]/10 text-[var(--mairie-on-action)]' : 'border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] text-[var(--mairie-text)]'
  );

  return (
    <div
      className={joinClasses('flex w-full flex-col', outgoing ? 'items-end' : 'items-start', className)}
      {...props}
    >
      <div
        className={joinClasses(
          'max-w-[min(560px,82%)] rounded-md px-4 py-3 text-sm leading-5 shadow-[var(--mairie-shadow)]',
          outgoing
            ? 'bg-[var(--mairie-action-background)] text-[var(--mairie-on-action)]'
            : 'border border-[var(--mairie-border)] bg-[var(--mairie-surface)] text-[var(--mairie-text)]'
        )}
      >
        <div>{mentionedContent}</div>
        {downloadError && <p role="alert" className="mt-2">{downloadError}</p>}
        {hasBusinessReferences && (
          <div className="mt-3 flex flex-wrap gap-2">
            {businessReferences.map((reference) =>
              reference.href ? (
                <a
                  key={reference.id}
                  href={reference.href}
                  className={actionableReferenceClassName}
                  onClick={onBusinessReferenceClick ? () => onBusinessReferenceClick(reference) : undefined}
                >
                  {getBusinessReferenceIcon(reference)}
                  <span className="min-w-0 truncate">{reference.title}</span>
                </a>
              ) : onBusinessReferenceClick ? (
                <button
                  key={reference.id}
                  type="button"
                  className={actionableReferenceClassName}
                  onClick={() => onBusinessReferenceClick(reference)}
                >
                  {getBusinessReferenceIcon(reference)}
                  <span className="min-w-0 truncate">{reference.title}</span>
                </button>
              ) : (
                <span key={reference.id} className={referenceClassName}>
                  {getBusinessReferenceIcon(reference)}
                  <span className="min-w-0 truncate">{reference.title}</span>
                </span>
              )
            )}
          </div>
        )}
        {hasAttachments && (
          <div className="mt-3 space-y-2">
            {message.attachments?.map((attachment) =>
              onAttachmentDownload ? <button key={attachment.id} type="button" className={attachmentClassName} disabled={downloadPending} onClick={async () => {
                if (downloadRef.current) return;
                downloadRef.current = true; setDownloadPending(true); setDownloadError('');
                try { await onAttachmentDownload(attachment, message); }
                catch (reason) { setDownloadError(reason instanceof Error ? reason.message : 'Le fichier n’a pas pu être téléchargé.'); }
                finally { downloadRef.current = false; setDownloadPending(false); }
              }}><FileText className="size-4 shrink-0" /><span className="min-w-0 truncate">{attachment.name}</span><span>{downloadPending ? 'Téléchargement…' : 'Télécharger'}</span></button> : attachment.url ? (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  download={attachment.name}
                  target="_blank"
                  rel="noreferrer"
                  className={joinClasses(
                    attachmentClassName,
                    outgoing ? 'hover:bg-[var(--mairie-surface)]/15' : 'hover:bg-[var(--mairie-background)]'
                  )}
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
        )}
      </div>
      {message.sentAt && (
        <span className={joinClasses('mt-1 text-xs leading-5 text-[var(--mairie-muted)]', outgoing ? 'mr-1' : 'ml-1')}>
          {message.sentAt}
        </span>
      )}
    </div>
  );
};
