import React from 'react';
import { AtSign, Briefcase, CalendarDays, FileText, Hash, ListTodo, Paperclip, Send, Smile, X } from 'lucide-react';

import { joinClasses } from './style';
import type { MessagingAttachment, MessagingBusinessReference, MessagingMention, MessagingSendResult } from './types';

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

const systemEmojiOptions = ['👍', '👏', '😊', '🎉', '✅', '🙏', '📎', '📌'];

const revokeDraftUrl = (url: string) => {
  try {
    if (typeof URL !== 'undefined') URL.revokeObjectURL?.(url);
  } catch {
    // Cleanup must never turn an acknowledged send into a retry.
  }
};

const normalizeMentionValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getTriggerMatch = (value: string, trigger: '@' | '#') => {
  const match = value.match(new RegExp(`(^|\\s)\\${trigger}([^\\s@#]*)$`));

  if (!match || match.index === undefined) return null;

  return {
    start: match.index + match[1].length,
    query: match[2],
  };
};

const getBusinessReferenceMatch = (value: string) => {
  const match = value.match(/(^|\s)#([^#@\r\n]*)$/);

  if (!match || match.index === undefined) return null;

  return {
    start: match.index + match[1].length,
    query: match[2].trim(),
  };
};

const getBusinessReferenceKindLabel = (reference: MessagingBusinessReference) => {
  if (reference.kind === 'event') return 'Événement du calendrier';
  if (reference.kind === 'task') return 'Tâche';

  return 'Projet';
};

const appendTrigger = (value: string, trigger: '@' | '#') =>
  `${value}${value.trim() && !value.endsWith(' ') ? ` ${trigger}` : trigger}`;

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
  const mentionSuggestions = mentionMatch
    ? mentionOptions
        .filter((mention) => normalizeMentionValue(mention.name).includes(normalizeMentionValue(mentionMatch.query)))
        .slice(0, 6)
    : [];
  const businessReferenceSuggestions =
    !mentionMatch && businessReferenceMatch
      ? businessReferenceOptions.filter((reference) =>
          normalizeMentionValue(reference.title).includes(normalizeMentionValue(businessReferenceMatch.query))
        )
      : [];
  const mentionSuggestionsOpen = mentionSuggestions.length > 0;
  const businessReferenceSuggestionsOpen = businessReferenceSuggestions.length > 0;

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

    const nextValue = `${currentValue.slice(0, mentionMatch.start)}@${mention.name} `;
    updateValue(nextValue);
    setMentions((currentMentions) =>
      currentMentions.some((currentMention) => currentMention.id === mention.id)
        ? currentMentions
        : [...currentMentions, mention]
    );

    window.setTimeout(() => textInputRef.current?.focus(), 0);
  };

  const selectBusinessReference = (reference: MessagingBusinessReference) => {
    if (isBusy || !businessReferenceMatch) return;

    const nextValue = `${currentValue.slice(0, businessReferenceMatch.start)}#${reference.title} `;
    updateValue(nextValue);
    setBusinessLinks((currentLinks) =>
      currentLinks.some((currentLink) => currentLink.id === reference.id)
        ? currentLinks
        : [...currentLinks, reference]
    );

    window.setTimeout(() => textInputRef.current?.focus(), 0);
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

  const getBusinessReferenceIcon = (reference: MessagingBusinessReference) => {
    if (reference.kind === 'event') return <CalendarDays className="size-4" strokeWidth={1.8} />;
    if (reference.kind === 'task') return <ListTodo className="size-4" strokeWidth={1.8} />;

    return <Briefcase className="size-4" strokeWidth={1.8} />;
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
          {(mentionSuggestionsOpen || businessReferenceSuggestionsOpen) && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 z-30 max-h-72 w-full max-w-[440px] overflow-y-auto rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-1 text-sm text-[var(--mairie-text)] shadow-lg">
              {mentionSuggestionsOpen
                ? mentionSuggestions.map((mention) => (
                    <button
                      key={mention.id}
                      type="button"
                      disabled={isBusy}
                      className="flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-left transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                      onClick={() => selectMention(mention)}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--mairie-action-background)] text-[var(--mairie-on-action)]">
                        <AtSign className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">@{mention.name}</span>
                        <span className="block truncate text-xs text-[var(--mairie-muted)]">
                          {mention.kind === 'group' ? 'Groupe' : mention.description || 'Contact'}
                        </span>
                      </span>
                    </button>
                  ))
                : businessReferenceSuggestions.map((reference) => (
                    <button
                      key={reference.id}
                      type="button"
                      title={reference.title}
                      disabled={isBusy}
                      className="flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-left transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                      onClick={() => selectBusinessReference(reference)}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--mairie-success-action-background)] text-[var(--mairie-on-action)]">
                        {getBusinessReferenceIcon(reference)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">#{reference.title}</span>
                        <span className="block truncate text-xs text-[var(--mairie-muted)]">
                          {getBusinessReferenceKindLabel(reference)}
                          {reference.description ? ` · ${reference.description}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
            </div>
          )}
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
      {attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span
              key={attachment.id}
              className="inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface-raised)] px-2.5 py-1.5 text-xs font-semibold text-[var(--mairie-text)]"
            >
              <FileText className="size-3.5 shrink-0" strokeWidth={1.8} />
              <span className="max-w-[180px] truncate">{attachment.name}</span>
              <button
                type="button"
                aria-label={`Retirer ${attachment.name}`}
                disabled={isBusy}
                className="inline-flex size-5 items-center justify-center rounded text-[var(--mairie-muted)] transition hover:bg-[var(--mairie-surface-raised)] hover:text-[var(--mairie-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                onClick={() => removeAttachment(attachment.id)}
              >
                <X className="size-3.5" strokeWidth={1.8} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label={attachLabel}
          title={attachLabel}
          disabled={isBusy || !onSendMessage}
          className="inline-flex size-8 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
          onClick={handleAttachClick}
        >
          <Paperclip className="size-4" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Mentionner un utilisateur"
          title="Mentionner un utilisateur"
          disabled={isBusy || !onSendMessage}
          className="inline-flex size-8 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
          onClick={() => {
            if (disabled) return;
            updateValue(appendTrigger(currentValue, '@'));
            window.setTimeout(() => textInputRef.current?.focus(), 0);
          }}
        >
          <AtSign className="size-4" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Mentionner un élément métier"
          title="Mentionner un élément métier"
          disabled={isBusy || !onSendMessage}
          className="inline-flex size-8 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
          onClick={() => {
            if (disabled) return;
            updateValue(appendTrigger(currentValue, '#'));
            window.setTimeout(() => textInputRef.current?.focus(), 0);
          }}
        >
          <Hash className="size-4" strokeWidth={1.8} />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label={emojiLabel}
            title={emojiLabel}
            disabled={isBusy || !onSendMessage}
            className="inline-flex size-8 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
            onClick={() => setEmojiOpen((open) => !open)}
          >
            <Smile className="size-4" strokeWidth={1.8} />
          </button>
          {emojiOpen && (
            <div
              className="absolute bottom-[calc(100%+8px)] left-0 z-20 grid gap-1 rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-2 shadow-lg"
              style={{
                gridTemplateColumns: 'repeat(4, 2rem)',
                width: '9.25rem',
              }}
            >
              {systemEmojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Ajouter ${emoji}`}
                  disabled={isBusy}
                  className="flex size-8 items-center justify-center rounded-md transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
                  style={{
                    fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                  }}
                  onClick={() => appendEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
