import React from 'react';
import { CancelButton, SendButton } from '@mairie360/lib-components/primitives';

import { MessagingModalFrame } from './MessagingModalFrame';
import { MessageTextArea } from './new-message/MessageTextArea';
import { RecipientSelect } from './new-message/RecipientSelect';
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
  const formId = React.useId();

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
      formId={formId}
      onClose={onCancel}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton label={cancelLabel} onClick={onCancel} />
          <SendButton type="submit" form={formId} label={submitLabel} disabled={!canSubmit} loading={isSending} />
        </>
      }
    >
      <RecipientSelect
        label={recipientLabel}
        placeholder={recipientPlaceholder}
        contacts={contacts}
        value={recipientValue}
        disabled={isSending}
        onChange={setRecipientValue}
      />
      <MessageTextArea
        label={messageLabel}
        placeholder={messagePlaceholder}
        value={message}
        disabled={isSending}
        onChange={setMessage}
      />
    </MessagingModalFrame>
  );
};
