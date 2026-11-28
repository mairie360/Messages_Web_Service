import React from 'react';
import { Avatar } from '@mairie360/lib-components/primitives';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { BubbleAttachments } from './components/BubbleAttachments';
import { BubbleReferences } from './components/BubbleReferences';
import { DeletedMessage } from './components/DeletedMessage';
import { MentionedContent } from './components/MentionedContent';
import { MessageActionsToolbar } from './components/MessageActionsToolbar';
import { MessageEditBox } from './components/MessageEditBox';
import { messageText } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model';
import { MessageQuote } from './components/MessageQuote';
import { MessageReactions } from './components/MessageReactions';
import { ReactionPicker } from './components/ReactionPicker';
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
  /** MAIR-1170: adds (`add`) or removes my reaction with this emoji. */
  onToggleReaction?: (message: MessagingMessage, emoji: string, add: boolean) => Promise<unknown> | unknown;
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
  onToggleReaction,
  className = '',
  ...props
}: MessagingMessageBubbleProps) => {
  // MAIR-1167: a long press opens the toolbar on a touch screen; leaving the message closes it.
  const [actionsOpen, setActionsOpen] = React.useState(false);
  // The toolbar is invisible until the bubble is hovered or focused (CSS), so it is only mounted from the first hover,
  // focus or long press on: one per message on every render made a thread of 30 messages twice as long to render
  // (MAIR-1169, k6 `/health` p95 over budget). Once mounted it stays, so the CSS shows and hides it as before.
  const [engaged, setEngaged] = React.useState(false);
  const engage = () => setEngaged(true);
  const pressTimer = React.useRef<number | undefined>(undefined);
  const stopPress = () => { window.clearTimeout(pressTimer.current); pressTimer.current = undefined; };
  React.useEffect(() => stopPress, []);
  // MAIR-1170: « Réagir » and « Ajouter une réaction » open the picker; one reaction change at a time.
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [reactionPending, setReactionPending] = React.useState(false);
  const react = async (emoji: string, add: boolean) => {
    if (!onToggleReaction || reactionPending) return;
    setPickerOpen(false);
    setReactionPending(true);
    try { await onToggleReaction(message, emoji, add); } finally { setReactionPending(false); }
  };
  const openReactions = onToggleReaction ? () => setPickerOpen(true) : onReact ? () => onReact(message) : undefined;
  // MAIR-1169: no action on a deleted message.
  const hasActions = !message.deleted && (!message.sendStatus || message.sendStatus === 'sent')
    ? !!(openReactions || onReply || onEdit || onDelete) : false;
  const [downloadError, setDownloadError] = React.useState('');
  const [downloadPending, setDownloadPending] = React.useState(false);
  const downloadRef = React.useRef(false);
  const outgoing = message.direction === 'outgoing';
  const author = outgoing ? undefined : message.authorName?.trim() || undefined;
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
      onPointerEnter={hasActions ? engage : undefined}
      onFocus={hasActions ? engage : undefined}
      onPointerDown={hasActions ? event => {
        if (event.pointerType !== 'touch') return;
        stopPress();
        pressTimer.current = window.setTimeout(() => setActionsOpen(true), LONG_PRESS_MS);
      } : undefined}
      onPointerUp={hasActions ? stopPress : undefined}
      onPointerLeave={hasActions ? stopPress : undefined}
      onBlur={hasActions ? event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActionsOpen(false); } : undefined}
      className={joinClasses('group/bubble relative flex w-full gap-2.5 rounded-md data-[revealed]:bg-[var(--mairie-accent-surface)] motion-safe:transition-colors', outgoing && 'flex-row-reverse', className)}
      {...props}
    >
      {/* The author of a received message: avatar on the left, name before the time. Mine only show the time. */}
      {author && (
        <Avatar alt={author} aria-hidden size="s" className="mt-0.5" data-message-avatar="" />
      )}
      <div className={joinClasses('flex min-w-0 flex-1 flex-col', outgoing ? 'items-end' : 'items-start')}>
        {(message.sentAt || author) && (
          <span
            data-bubble-time=""
            className={joinClasses('mb-1 text-xs leading-5 text-[var(--mairie-muted)]', outgoing ? 'mr-1 self-end text-right' : 'ml-1')}
          >
            {author && (
              <span className="mr-1.5 font-semibold text-[var(--mairie-text)]" data-message-author={message.authorId === undefined ? '' : String(message.authorId)}>
                {author}
              </span>
            )}
            {message.sentAt}
            {/* An edited message says so after its time. */}
            {message.editedAt && !message.deleted ? ' · modifié' : ''}
          </span>
        )}
        {message.citation !== undefined && !message.deleted && (
          <MessageQuote
            authorName={message.quoted?.authorName}
            excerpt={message.quoted?.excerpt}
            // « Message supprimé » only when the quoted message is known to be deleted (BFF flag or deletion seen here).
            deleted={quoteDeleted || message.quoted?.deleted === true}
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
        {!message.deleted && (message.reactions?.length ?? 0) > 0 && (
          <MessageReactions
            reactions={message.reactions ?? []}
            outgoing={outgoing}
            pending={reactionPending}
            onToggle={onToggleReaction ? reaction => void react(reaction.emoji, !reaction.reactedByMe) : undefined}
            onAdd={onToggleReaction ? () => setPickerOpen(true) : undefined}
          />
        )}
        {pickerOpen && onToggleReaction && !message.deleted && (
          <ReactionPicker
            outgoing={outgoing}
            onPick={emoji => void react(emoji, !message.reactions?.some(reaction => reaction.emoji === emoji && reaction.reactedByMe))}
            onClose={() => setPickerOpen(false)}
          />
        )}
        {outgoing && message.sendStatus && <MessageSendStatus status={message.sendStatus} onRetry={onRetrySend} />}
      </div>
      {/* The actions overlay the message, out of the flow: a direct child of the positioned row. */}
      {hasActions && !editing && (engaged || actionsOpen) && (
        <MessageActionsToolbar
          open={actionsOpen}
          outgoing={outgoing}
          onReact={openReactions}
          onReply={onReply ? () => onReply(message) : undefined}
          onEdit={onEdit ? () => onEdit(message) : undefined}
          onDelete={onDelete ? () => onDelete(message) : undefined}
        />
      )}
    </div>
  );
};
