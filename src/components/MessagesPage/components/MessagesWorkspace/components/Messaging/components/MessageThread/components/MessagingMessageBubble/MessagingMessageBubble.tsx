import React from 'react';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { BubbleAttachments } from './components/BubbleAttachments';
import { BubbleReferences } from './components/BubbleReferences';
import { MentionedContent } from './components/MentionedContent';
import { uniqueBusinessReferences } from './bubble-model';
import type {
  MessagingAttachment,
  MessagingBusinessReference,
  MessagingMention,
  MessagingMessage,
} from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface MessagingMessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: MessagingMessage;
  mentionOptions?: MessagingMention[];
  businessReferenceOptions?: MessagingBusinessReference[];
  onAttachmentDownload?: (attachment: MessagingAttachment, message: MessagingMessage) => Promise<void>;
  onBusinessReferenceClick?: (reference: MessagingBusinessReference) => void;
}

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
  const businessReferences = uniqueBusinessReferences(message);

  // One download at a time per message; a failure is shown inside the bubble.
  const download = async (attachment: MessagingAttachment) => {
    if (!onAttachmentDownload || downloadRef.current) return;
    downloadRef.current = true; setDownloadPending(true); setDownloadError('');
    try { await onAttachmentDownload(attachment, message); }
    catch (reason) { setDownloadError(reason instanceof Error ? reason.message : 'Le fichier n’a pas pu être téléchargé.'); }
    finally { downloadRef.current = false; setDownloadPending(false); }
  };

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
        <MentionedContent
          content={message.content}
          mentions={[...mentionOptions, ...(message.mentions ?? [])]}
          businessReferences={[...businessReferenceOptions, ...businessReferences]}
        />
        {downloadError && <p role="alert" className="mt-2">{downloadError}</p>}
        <BubbleReferences references={businessReferences} outgoing={outgoing} onReferenceClick={onBusinessReferenceClick} />
        <BubbleAttachments
          attachments={message.attachments ?? []}
          outgoing={outgoing}
          downloadPending={downloadPending}
          onDownload={onAttachmentDownload ? attachment => void download(attachment) : undefined}
        />
      </div>
      {message.sentAt && (
        <span className={joinClasses('mt-1 text-xs leading-5 text-[var(--mairie-muted)]', outgoing ? 'mr-1' : 'ml-1')}>
          {message.sentAt}
        </span>
      )}
    </div>
  );
};
