import React from 'react';
import { ChevronDown, Send } from 'lucide-react';

import { joinClasses } from './style';
import { MessagingModalFrame } from './MessagingModalFrame';
import type { MessagingContactId, MessagingConversation, MessagingSendResult, NewMessagePayload } from './types';

export interface NewMessageModalProps {
  isOpen: boolean;
  contacts: MessagingConversation[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  recipientLabel?: string;
  recipientPlaceholder?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
  cancelLabel?: string;
  submitLabel?: string;
  initialRecipientId?: MessagingContactId;
  initialMessage?: string;
  onCancel: () => void;
  onSendMessage: (payload: NewMessagePayload) => MessagingSendResult;
}

const fieldClassName =
  'h-9 w-full rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-3 text-sm text-[var(--mairie-text)] outline-none transition placeholder:text-[var(--mairie-muted)] focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20';

const buttonSecondaryClassName =
  'inline-flex h-9 items-center justify-center rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4 text-sm font-semibold text-[var(--mairie-text)] shadow-sm transition hover:bg-[var(--mairie-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/25';

const buttonPrimaryClassName =
  'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--mairie-action-background)] px-4 text-sm font-semibold text-[var(--mairie-on-action)] shadow-sm transition hover:bg-[var(--mairie-action-hover-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/35 disabled:cursor-not-allowed disabled:bg-[var(--mairie-border)]';

export const NewMessageModal = ({
  isOpen,
  contacts,
  title = 'Nouveau message',
  subtitle = 'Envoyer un message direct à un contact',
  recipientLabel = 'Destinataire',
  recipientPlaceholder = 'Choisir un contact',
  messageLabel = 'Message',
  messagePlaceholder = 'Tapez votre message...',
  cancelLabel = 'Annuler',
  submitLabel = 'Envoyer',
  initialRecipientId,
  initialMessage = '',
  onCancel,
  onSendMessage,
}: NewMessageModalProps) => {
  const initialRecipientValue = initialRecipientId === undefined ? '' : String(initialRecipientId);
  const [recipientValue, setRecipientValue] = React.useState(initialRecipientValue);
  const [message, setMessage] = React.useState(initialMessage);
  const [isSending, setIsSending] = React.useState(false);
  const sendingRef = React.useRef(false);
  const titleId = React.useId();
  const subtitleId = React.useId();
  const recipientId = React.useId();
  const messageId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;

    setRecipientValue(initialRecipientValue);
    setMessage(initialMessage);
  }, [initialMessage, initialRecipientValue, isOpen]);

  if (!isOpen) return null;

  const selectedContact = contacts.find((contact) => String(contact.id) === recipientValue);
  const canSubmit = !!selectedContact && message.trim().length > 0 && !isSending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContact || !message.trim() || sendingRef.current) return;

    sendingRef.current = true;
    try {
      const result = onSendMessage({
        recipientId: selectedContact.id,
        message: message.trim(),
      });
      if (result instanceof Promise) {
        setIsSending(true);
        void result
          .catch(() => {
            // The consumer displays the error; keep recipient and message for retry.
          })
          .finally(() => {
            sendingRef.current = false;
            setIsSending(false);
          });
      } else {
        sendingRef.current = false;
      }
    } catch {
      sendingRef.current = false;
    }
  };

  return (
    <MessagingModalFrame
      title={title}
      subtitle={subtitle}
      titleId={titleId}
      subtitleId={subtitleId}
      onClose={onCancel}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className={buttonSecondaryClassName} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="submit" className={buttonPrimaryClassName} disabled={!canSubmit}>
            <Send className="size-4" strokeWidth={1.8} />
            <span>{submitLabel}</span>
          </button>
        </>
      }
    >
      <div>
        <label htmlFor={recipientId} className="mb-1 block text-sm font-semibold leading-5 text-[var(--mairie-text)]">
          {recipientLabel}
        </label>
        <div className="relative">
          <select
            id={recipientId}
            value={recipientValue}
            disabled={isSending}
            className={joinClasses(fieldClassName, 'appearance-none pr-10')}
            onChange={(event) => setRecipientValue(event.target.value)}
          >
            <option value="">{recipientPlaceholder}</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={String(contact.id)}>
                {contact.name}
                {contact.department ? ` - ${contact.department}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mairie-muted)]" />
        </div>
      </div>

      <div>
        <label htmlFor={messageId} className="mb-1 block text-sm font-semibold leading-5 text-[var(--mairie-text)]">
          {messageLabel}
        </label>
        <textarea
          id={messageId}
          value={message}
          disabled={isSending}
          placeholder={messagePlaceholder}
          className={joinClasses(fieldClassName, 'h-[100px] resize-none py-2')}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
    </MessagingModalFrame>
  );
};
