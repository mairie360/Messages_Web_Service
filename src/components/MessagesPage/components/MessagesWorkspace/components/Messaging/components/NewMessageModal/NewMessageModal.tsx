import React from 'react';
import { CancelButton, ErrorAlert, SendButton } from '@mairie360/lib-components/primitives';

import { MessagingModalFrame } from '../MessagingModalFrame';
import { MessageTextArea } from './components/MessageTextArea';
import { RecipientSelect } from './components/RecipientSelect';
import type { MessagingContactId, MessagingConversation, MessagingSendResult, NewMessagePayload } from '../../messaging-types';

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
  const [sendFailed, setSendFailed] = React.useState(false);
  const sendingRef = React.useRef(false);
  const formId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;

    setRecipientValue(initialRecipientValue);
    setMessage(initialMessage);
    setSendFailed(false);
  }, [initialMessage, initialRecipientValue, isOpen]);

  if (!isOpen) return null;

  const selectedContact = contacts.find((contact) => String(contact.id) === recipientValue);
  const canSubmit = !!selectedContact && message.trim().length > 0 && !isSending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContact || !message.trim() || sendingRef.current) return;

    sendingRef.current = true;
    setSendFailed(false);
    try {
      const result = onSendMessage({
        recipientId: selectedContact.id,
        message: message.trim(),
      });
      if (result instanceof Promise) {
        setIsSending(true);
        void result
          .then((confirmed) => { if (confirmed === false) setSendFailed(true); })
          .catch(() => {
            // MAIR-878: the refusal shows above the form; recipient and message stay for a retry.
            setSendFailed(true);
          })
          .finally(() => {
            sendingRef.current = false;
            setIsSending(false);
          });
      } else {
        if (result === false) setSendFailed(true);
        sendingRef.current = false;
      }
    } catch {
      setSendFailed(true);
      sendingRef.current = false;
    }
  };

  return (
    <MessagingModalFrame
      title={title}
      subtitle={subtitle}
      formId={formId}
      onClose={onCancel}
      closeDisabled={isSending}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton label={cancelLabel} onClick={onCancel} disabled={isSending} />
          <SendButton type="submit" form={formId} label={submitLabel} disabled={!canSubmit} loading={isSending} />
        </>
      }
    >
      {sendFailed && (
        <ErrorAlert size="s" title="Le message n’a pas pu être envoyé. Vos saisies sont conservées ; vous pouvez réessayer." />
      )}
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
