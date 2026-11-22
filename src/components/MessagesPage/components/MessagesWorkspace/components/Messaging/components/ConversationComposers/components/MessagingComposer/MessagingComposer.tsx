import React from 'react';
import { Send } from 'lucide-react';
import { IconButton, ToolTip } from '@mairie360/lib-components/primitives';

import { joinClasses } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-style';
import { ComposerAttachmentChips } from './components/ComposerAttachmentChips';
import { ComposerToolbar } from './components/ComposerToolbar';
import { addOnce, appendTrigger, revokeDraftUrl } from './composer-text';
import { MentionSuggestions, suggestionOptionId } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MentionSuggestions';
import { insertTag, useTagSuggestions, type TagOption } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/use-tag-suggestions';
import type { MessagingAttachment, MessagingBusinessReference, MessagingMention, MessagingSendResult, MessagingTagSuggestionSources } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

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
  /** MAIR-1162: a draft delivered by « Réessayer l'envoi » of its bubble; released when the draft is unchanged. */
  releaseDraft?: { content: string; token: number };
  /** MAIR-1166: suggestions of `@` and `#` from the BFF; the local options are used without them. */
  suggestionSources?: MessagingTagSuggestionSources;
}

export const MessagingComposer = ({
  value,
  defaultValue = '',
  placeholder = 'Tapez votre message...',
  sendLabel = 'Envoyer',
  attachLabel = 'Joindre un fichier',
  emojiLabel = 'Insérer un emoji',
  disabled = false,
  mentionOptions = [],
  businessReferenceOptions = [],
  onValueChange,
  onSendMessage,
  onAttach,
  onEmoji,
  releaseDraft,
  suggestionSources,
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
  // MAIR-1166: the tag being typed and its suggestions (combobox of the text field).
  const suggestions = useTagSuggestions(currentValue, { mentions: mentionOptions, references: businessReferenceOptions }, suggestionSources);
  const listId = React.useId();

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

  // MAIR-1162: the bubble delivered this draft; a draft changed since then is kept (MAIR-370).
  const releasedToken = React.useRef(releaseDraft?.token);
  React.useEffect(() => {
    if (!releaseDraft || releaseDraft.token === releasedToken.current) return;
    releasedToken.current = releaseDraft.token;
    if (!sendingRef.current && (currentValue.trim() || 'Pièce jointe') === releaseDraft.content) clearDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new release token is an event
  }, [releaseDraft]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextMessage = currentValue.trim() || 'Pièce jointe';
    if ((!currentValue.trim() && attachments.length === 0) || disabled || sendingRef.current || !onSendMessage) return;

    const messageMentions = mentions.filter((mention) => currentValue.includes(`@${mention.name}`));
    const messageBusinessLinks = businessLinks.filter((reference) => currentValue.includes(`#${reference.title}`));

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

  // The chosen tag is frozen: it is followed by a space and what is typed next is plain text.
  const selectOption = (option: TagOption) => {
    if (isBusy || !suggestions.match) return;
    const { mention, reference } = option;
    if (mention) {
      updateValue(insertTag(currentValue, suggestions.match, mention.name));
      setMentions((currentMentions) => addOnce(currentMentions, mention));
    } else if (reference) {
      updateValue(insertTag(currentValue, suggestions.match, reference.title));
      setBusinessLinks((currentLinks) => addOnce(currentLinks, reference));
    }
    focusInputSoon();
  };

  // MAIR-1166: ↑ ↓ move in the open list, Entrée / Tab choose, Échap closes it; Entrée sends when it is closed.
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      suggestions.move(event.key === 'ArrowDown' ? 1 : -1);
    } else if ((event.key === 'Enter' || event.key === 'Tab') && suggestions.activeOption) {
      event.preventDefault();
      selectOption(suggestions.activeOption);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      suggestions.dismiss();
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
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.open}
            aria-controls={suggestions.open ? listId : undefined}
            aria-activedescendant={suggestions.open ? suggestionOptionId(listId, suggestions.activeIndex) : undefined}
            value={currentValue}
            placeholder={placeholder}
            disabled={isBusy || !onSendMessage}
            className="h-10 w-full rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-3 text-sm text-[var(--mairie-text)] outline-none transition placeholder:text-[var(--mairie-muted)] focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20 disabled:cursor-not-allowed disabled:bg-[var(--mairie-background)]"
            onChange={handleChange}
            onKeyDown={handleInputKeyDown}
          />
          {suggestions.open && (
            <MentionSuggestions
              id={listId}
              options={suggestions.options}
              activeIndex={suggestions.activeIndex}
              disabled={isBusy}
              onSelect={selectOption}
              onActiveChange={suggestions.setActiveIndex}
            />
          )}
        </div>
        <ToolTip text={sendLabel}>
          <IconButton type="submit" icon={Send} label={sendLabel} title="" tone="primary" disabled={!canSend} />
        </ToolTip>
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
