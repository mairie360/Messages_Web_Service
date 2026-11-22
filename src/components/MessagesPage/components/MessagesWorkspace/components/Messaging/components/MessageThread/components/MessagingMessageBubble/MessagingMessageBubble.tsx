import React from 'react';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { BubbleAttachments } from './components/BubbleAttachments';
import { BubbleReferences } from './components/BubbleReferences';
import { DeletedMessage } from './components/DeletedMessage';
import { MentionedContent } from './components/MentionedContent';
import { MessageActionsToolbar } from './components/MessageActionsToolbar';
import { MessageEditBox } from './components/MessageEditBox';
import { messageText } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model';
import { MessageQuote } from './components/MessageQuote';
import { MessageSendStatus } from './components/MessageSendStatus';
import { uniqueBusinessReferences } from './bubble-model';
import type {
  MessagingEditPayload,
  MessagingTagSuggestionSources,
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
  /** MAIR-1167: actions of the toolbar shown on hover / focus / long press. */
  onReact?: (message: MessagingMessage) => void;
  onReply?: (message: MessagingMessage) => void;
  onEdit?: (message: MessagingMessage) => void;
  onDelete?: (message: MessagingMessage) => void;
  /** MAIR-1167: scroll to the message this one quotes. */
  onOpenQuote?: (messageId: MessagingMessage['id']) => void;
  /** MAIR-1167: the quoted message was deleted. */
  quoteDeleted?: boolean;
  /** MAIR-1168: the bubble is replaced by the edit box. */
  editing?: boolean;
  onSaveEdit?: (message: MessagingMessage, payload: MessagingEditPayload) => Promise<boolean | void> | boolean | void;
  onCancelEdit?: () => void;
  suggestionSources?: MessagingTagSuggestionSources;
}

/** Time of a press that opens the actions of a message on a touch screen. */
export const LONG_PRESS_MS = 500;

export const MessagingMessageBubble = ({
  message,
  mentionOptions = [],
  businessReferenceOptions = [],
  onBusinessReferenceClick,
  onAttachmentDownload,
  onRetrySend,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onOpenQuote,
  quoteDeleted = false,
  editing = false,
  onSaveEdit,
  onCancelEdit,
  suggestionSources,
  className = '',
  ...props
}: MessagingMessageBubbleProps) => {
  // MAIR-1167: a long press opens the toolbar on a touch screen; leaving the message closes it.
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const pressTimer = React.useRef<number | undefined>(undefined);
  const stopPress = () => { window.clearTimeout(pressTimer.current); pressTimer.current = undefined; };
  React.useEffect(() => stopPress, []);
  // MAIR-1169: no action on a deleted message.
  const hasActions = !message.deleted && (!message.sendStatus || message.sendStatus === 'sent')
    ? !!(onReact || onReply || onEdit || onDelete) : false;
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
      // MAIR-1164: a message reached from the search (or a quote) is highlighted for a moment (`data-revealed`).
      onPointerDown={hasActions ? event => {
        if (event.pointerType !== 'touch') return;
        stopPress();
        pressTimer.current = window.setTimeout(() => setActionsOpen(true), LONG_PRESS_MS);
      } : undefined}
      onPointerUp={hasActions ? stopPress : undefined}
      onPointerLeave={hasActions ? stopPress : undefined}
      onBlur={hasActions ? event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActionsOpen(false); } : undefined}
      className={joinClasses('group/bubble flex w-full flex-col rounded-md data-[revealed]:bg-[var(--mairie-accent-surface)] motion-safe:transition-colors', outgoing ? 'items-end' : 'items-start', className)}
      {...props}
    >
      {/* MAIR-1159: the time sits above the bubble, right-aligned for my messages. */}
      {message.sentAt && (
        <span
          data-bubble-time=""
          className={joinClasses('mb-1 text-xs leading-5 text-[var(--mairie-muted)]', outgoing ? 'mr-1 self-end text-right' : 'ml-1')}
        >
          {message.sentAt}
          {/* MAIR-1168: an edited message says so after its time. */}
          {message.editedAt && !message.deleted ? ' · modifié' : ''}
        </span>
      )}
      {message.citation !== undefined && !message.deleted && (
        <MessageQuote
          authorName={message.quoted?.authorName}
          excerpt={message.quoted?.excerpt}
          deleted={quoteDeleted || !message.quoted}
          outgoing={outgoing}
          onOpen={onOpenQuote ? () => onOpenQuote(message.citation!) : undefined}
        />
      )}
      {message.deleted ? (
        <DeletedMessage outgoing={outgoing} />
      ) : editing && onSaveEdit ? (
        <MessageEditBox
          message={message}
          initialText={messageText(message)}
          mentionOptions={mentionOptions}
          businessReferenceOptions={businessReferenceOptions}
          suggestionSources={suggestionSources}
          onSave={payload => onSaveEdit(message, payload)}
          onCancel={() => onCancelEdit?.()}
        />
      ) : (
      <div
        // MAIR-1167: the bubble takes the keyboard focus so that its actions are reachable.
        tabIndex={hasActions ? 0 : undefined}
        data-direction={outgoing ? 'outgoing' : 'incoming'}
        data-send-status={message.sendStatus}
        className={joinClasses(
          'max-w-[min(560px,82%)] rounded-md px-4 py-3 text-sm leading-5 shadow-[var(--mairie-shadow)] motion-safe:transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)]',
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
      )}
      {hasActions && !editing && (
        <MessageActionsToolbar
          open={actionsOpen}
          outgoing={outgoing}
          onReact={onReact ? () => onReact(message) : undefined}
          onReply={onReply ? () => onReply(message) : undefined}
          onEdit={onEdit ? () => onEdit(message) : undefined}
          onDelete={onDelete ? () => onDelete(message) : undefined}
        />
      )}
      {outgoing && message.sendStatus && <MessageSendStatus status={message.sendStatus} onRetry={onRetrySend} />}
    </div>
  );
};
