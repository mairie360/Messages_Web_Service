import React from 'react';
import { Send } from 'lucide-react';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { ComposerAttachmentChips } from './components/ComposerAttachmentChips';
import { ComposerSuggestions } from './components/ComposerSuggestions';
import { ComposerToolbar } from './components/ComposerToolbar';
import {
  addOnce,
  appendTrigger,
  businessReferenceSuggestionsFor,
  getBusinessReferenceMatch,
  getTriggerMatch,
  insertToken,
  mentionSuggestionsFor,
  revokeDraftUrl,
} from './composer-text';
import type { MessagingAttachment, MessagingBusinessReference, MessagingMention, MessagingSendResult } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface MessagingComposerProps extends React.HTMLAttributes<HTMLFormElement> {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  sendLabel?: string;
  attachLabel?: string;
  emojiLabel?: string;
  disabled?: boolean;
  mentionOptions?: MessagingMention[];
  businessReferenceOptions?: MessagingBusinessReference[];
  onValueChange?: (value: string) => void;
  onSendMessage?: (
    message: string,
    attachments?: MessagingAttachment[],
    mentions?: MessagingMention[],
    businessLinks?: MessagingBusinessReference[]
  ) => MessagingSendResult;
  onAttach?: (files: File[], attachments: MessagingAttachment[]) => void;
  onEmoji?: (emoji: string) => void;
}

export const MessagingComposer = ({
  value,
  defaultValue = '',
  placeholder = 'Tapez votre message...',
  sendLabel = 'Envoyer',
  attachLabel = 'Joindre un fichier',
  emojiLabel = 'Ajouter une réaction',
  disabled = false,
  mentionOptions = [],
  businessReferenceOptions = [],
  onValueChange,
  onSendMessage,
  onAttach,
  onEmoji,
  className = '',
  ...props
}: MessagingComposerProps) => {
  const textInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [attachments, setAttachments] = React.useState<MessagingAttachment[]>([]);
  const [mentions, setMentions] = React.useState<MessagingMention[]>([]);
  const [businessLinks, setBusinessLinks] = React.useState<MessagingBusinessReference[]>([]);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const sendingRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const ownedUrlsRef = React.useRef(new Set<string>());
  React.useEffect(() => {
    mountedRef.current = true;
    const urls = ownedUrlsRef.current;
    return () => {
      mountedRef.current = false;
      urls.forEach(revokeDraftUrl);
      urls.clear();
    };
  }, []);
  const currentValue = value ?? internalValue;
  const isBusy = disabled || isSending;
  const canSend = (currentValue.trim().length > 0 || attachments.length > 0) && !isBusy && !!onSendMessage;
  const mentionMatch = getTriggerMatch(currentValue, '@');
  const businessReferenceMatch = getBusinessReferenceMatch(currentValue);
  const mentionSuggestions = mentionSuggestionsFor(mentionOptions, mentionMatch);
  const businessReferenceSuggestions =
    businessReferenceSuggestionsFor(businessReferenceOptions, mentionMatch ? null : businessReferenceMatch);
  const mentionSuggestionsOpen = mentionSuggestions.length > 0;
  const businessReferenceSuggestionsOpen = businessReferenceSuggestions.length > 0;

  const focusInputSoon = () => window.setTimeout(() => textInputRef.current?.focus(), 0);

  const appendDraftTrigger = (trigger: '@' | '#') => {
    if (disabled) return;
    updateValue(appendTrigger(currentValue, trigger));
    focusInputSoon();
  };

  const updateValue = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextMessage = currentValue.trim() || 'Pièce jointe';
    if ((!currentValue.trim() && attachments.length === 0) || disabled || sendingRef.current || !onSendMessage) return;

    const messageMentions = mentions.filter((mention) => currentValue.includes(`@${mention.name}`));
    const messageBusinessLinks = businessLinks.filter((reference) => currentValue.includes(`#${reference.title}`));

    const clearDraft = () => {
      if (!mountedRef.current) return;
      ownedUrlsRef.current.forEach(revokeDraftUrl);
      ownedUrlsRef.current.clear();
      if (value === undefined) setInternalValue('');
      setAttachments([]);
      setMentions([]);
      setBusinessLinks([]);
      setEmojiOpen(false);
      onValueChange?.('');
    };

    sendingRef.current = true;
    try {
      const result = onSendMessage(nextMessage, attachments, messageMentions, messageBusinessLinks);
      if (result instanceof Promise) {
        setIsSending(true);
        void result
          .then((confirmed) => {
            if (confirmed !== false) clearDraft();
          })
          .catch(() => {
            // The consumer owns error presentation; keep the draft for retry.
          })
          .finally(() => {
            sendingRef.current = false;
            if (mountedRef.current) setIsSending(false);
          });
      } else {
        if (result !== false) clearDraft();
        sendingRef.current = false;
      }
    } catch {
      sendingRef.current = false;
    }
  };

  const handleAttachClick = () => {
    if (isBusy || !onSendMessage) return;
    fileInputRef.current?.click();
  };

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isBusy) return;
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const nextAttachments = files.map((file, index) => {
      const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(file) : undefined;
      if (url) ownedUrlsRef.current.add(url);
      return {
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
      };
    });

    setAttachments((currentAttachments) => [...currentAttachments, ...nextAttachments]);
    onAttach?.(files, nextAttachments);
    event.target.value = '';
  };

  const removeAttachment = (attachmentId: MessagingAttachment['id']) => {
    const removedAttachment = attachments.find((attachment) => attachment.id === attachmentId);
    if (removedAttachment?.url && ownedUrlsRef.current.delete(removedAttachment.url)) {
      revokeDraftUrl(removedAttachment.url);
    }
    setAttachments(currentAttachments => currentAttachments.filter(attachment => attachment.id !== attachmentId));
  };

  const appendEmoji = (emoji: string) => {
    if (isBusy) return;
    updateValue(`${currentValue}${emoji}`);
    setEmojiOpen(false);
    onEmoji?.(emoji);
  };

  const selectMention = (mention: MessagingMention) => {
    if (isBusy || !mentionMatch) return;

    updateValue(insertToken(currentValue, mentionMatch, `@${mention.name}`));
    setMentions((currentMentions) => addOnce(currentMentions, mention));
    focusInputSoon();
  };

  const selectBusinessReference = (reference: MessagingBusinessReference) => {
    if (isBusy || !businessReferenceMatch) return;

    updateValue(insertToken(currentValue, businessReferenceMatch, `#${reference.title}`));
    setBusinessLinks((currentLinks) => addOnce(currentLinks, reference));
    focusInputSoon();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === 'Tab') && mentionSuggestionsOpen) {
      event.preventDefault();
      selectMention(mentionSuggestions[0]);
    }

    if ((event.key === 'Enter' || event.key === 'Tab') && businessReferenceSuggestionsOpen) {
      event.preventDefault();
      selectBusinessReference(businessReferenceSuggestions[0]);
    }
  };

  return (
    <form
      className={joinClasses(
        'border-t border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4 py-4 text-[var(--mairie-text)] sm:px-5',
        className
      )}
      onSubmit={handleSubmit}
      {...props}
    >
      <input
        ref={fileInputRef}
        hidden
        type="file"
        className="hidden"
        multiple
        disabled={isBusy || !onSendMessage}
        tabIndex={-1}
        onChange={handleFilesChange}
      />
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            ref={textInputRef}
            aria-label="Écrire un message"
            type="text"
            value={currentValue}
            placeholder={placeholder}
            disabled={isBusy || !onSendMessage}
            className="h-10 w-full rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-3 text-sm text-[var(--mairie-text)] outline-none transition placeholder:text-[var(--mairie-muted)] focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20 disabled:cursor-not-allowed disabled:bg-[var(--mairie-background)]"
            onChange={handleChange}
            onKeyDown={handleInputKeyDown}
          />
          <ComposerSuggestions
            mentions={mentionSuggestions}
            businessReferences={businessReferenceSuggestions}
            disabled={isBusy}
            onSelectMention={selectMention}
            onSelectBusinessReference={selectBusinessReference}
          />
        </div>
        <button
          type="submit"
          aria-label={sendLabel}
          title={sendLabel}
          disabled={!canSend}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--mairie-action-background)] text-[var(--mairie-on-action)] shadow-sm transition hover:bg-[var(--mairie-action-hover-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/35 disabled:cursor-not-allowed disabled:bg-[var(--mairie-border)]"
        >
          <Send className="size-4" strokeWidth={1.8} />
        </button>
      </div>
      <ComposerAttachmentChips attachments={attachments} disabled={isBusy} onRemove={removeAttachment} />
      <ComposerToolbar
        attachLabel={attachLabel}
        emojiLabel={emojiLabel}
        disabled={isBusy || !onSendMessage}
        busy={isBusy}
        emojiOpen={emojiOpen}
        onAttach={handleAttachClick}
        onMention={() => appendDraftTrigger('@')}
        onBusinessReference={() => appendDraftTrigger('#')}
        onToggleEmoji={() => setEmojiOpen((open) => !open)}
        onPickEmoji={appendEmoji}
      />
    </form>
  );
};
