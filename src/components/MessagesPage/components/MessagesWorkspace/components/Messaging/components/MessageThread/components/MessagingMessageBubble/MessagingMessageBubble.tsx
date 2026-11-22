import React from 'react';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { BubbleAttachments } from './components/BubbleAttachments';
import { BubbleReferences } from './components/BubbleReferences';
import { MentionedContent } from './components/MentionedContent';
import { MessageSendStatus } from './components/MessageSendStatus';
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
  /** MAIR-1162: « Réessayer l'envoi » of a failed send. */
  onRetrySend?: () => void;
}

export const MessagingMessageBubble = ({
  message,
  mentionOptions = [],
  businessReferenceOptions = [],
  onBusinessReferenceClick,
  onAttachmentDownload,
  onRetrySend,
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
      {/* MAIR-1159: the time sits above the bubble, right-aligned for my messages. */}
      {message.sentAt && (
        <span
          data-bubble-time=""
          className={joinClasses('mb-1 text-xs leading-5 text-[var(--mairie-muted)]', outgoing ? 'mr-1 self-end text-right' : 'ml-1')}
        >
          {message.sentAt}
        </span>
      )}
      <div
        data-direction={outgoing ? 'outgoing' : 'incoming'}
        data-send-status={message.sendStatus}
        className={joinClasses(
          'max-w-[min(560px,82%)] rounded-md px-4 py-3 text-sm leading-5 shadow-[var(--mairie-shadow)] motion-safe:transition-opacity',
          // MAIR-1162: dimmed while sending, dashed error border when the send failed.
          message.sendStatus === 'sending' && 'opacity-60',
          message.sendStatus === 'failed' && '!border-dashed !border-[var(--mairie-error-text)]',
          outgoing
            ? // MAIR-1159: my messages on the lib message-own tokens (muted beige, contrasted text, 8.8:1).
              'border border-[var(--mairie-message-own-border)] bg-[var(--mairie-message-own-background)] text-[var(--mairie-message-own-on)]'
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
      {outgoing && message.sendStatus && <MessageSendStatus status={message.sendStatus} onRetry={onRetrySend} />}
    </div>
  );
};
