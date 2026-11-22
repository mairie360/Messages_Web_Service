import React from 'react';
import { AtSign, Hash } from 'lucide-react';
import { Button, ErrorAlert, IconButton, TextArea, ToolTip } from '@mairie360/lib-components/primitives';

import { MentionSuggestions, suggestionOptionId } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/MentionSuggestions';
import { appendTagTrigger, insertTag, useTagSuggestions, type TagOption } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/use-tag-suggestions';
import { messageTags, tagsIn } from './edit-tags';
import type {
  MessagingBusinessReference,
  MessagingEditPayload,
  MessagingMention,
  MessagingMessage,
  MessagingTagSuggestionSources,
} from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface MessageEditBoxProps {
  message: MessagingMessage;
  /** The text as written. */
  initialText: string;
  mentionOptions?: MessagingMention[];
  businessReferenceOptions?: MessagingBusinessReference[];
  suggestionSources?: MessagingTagSuggestionSources;
  /** Answers whether the edit was saved; a refusal (`false` or a rejection) keeps the box and its text. */
  onSave: (payload: MessagingEditPayload) => Promise<boolean | void> | boolean | void;
  onCancel: () => void;
}

/**
 * « Modifier » of one of my messages (MAIR-1168, Figma F14): the bubble becomes a lib `TextArea` with the same `@` and
 * `#` suggestions as the composer (the tags of the message stay tags), « Échap pour annuler · Entrée pour
 * enregistrer », and Annuler / Enregistrer. Enregistrer is disabled while the text is empty or unchanged; a refused
 * save shows a lib `ErrorAlert` under the box and keeps the text.
 */
export const MessageEditBox = ({
  message, initialText, mentionOptions = [], businessReferenceOptions = [], suggestionSources, onSave, onCancel,
}: MessageEditBoxProps) => {
  const [text, setText] = React.useState(initialText);
  const [tags, setTags] = React.useState(() => messageTags(message));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const listId = React.useId();
  const suggestions = useTagSuggestions(text, { mentions: mentionOptions, references: businessReferenceOptions }, suggestionSources);
  const canSave = text.trim().length > 0 && text.trim() !== initialText.trim() && !saving;

  React.useEffect(() => {
    const field = fieldRef.current;
    field?.focus();
    field?.setSelectionRange?.(field.value.length, field.value.length);
  }, []);

  const select = (option: TagOption) => {
    if (!suggestions.match) return;
    setText(insertTag(text, suggestions.match, option.mention?.name ?? option.reference?.title ?? ''));
    setTags(current => ({
      mentions: option.mention && !current.mentions.some(item => String(item.id) === String(option.mention!.id)) ? [...current.mentions, option.mention] : current.mentions,
      references: option.reference && !current.references.some(item => String(item.id) === String(option.reference!.id)) ? [...current.references, option.reference] : current.references,
    }));
    fieldRef.current?.focus();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true); setError(null);
    try {
      const content = text.trim();
      const saved = await onSave({ content, ...tagsIn(content, tags) });
      if (saved === false) setError('Le message n’a pas pu être modifié.');
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : 'Le message n’a pas pu être modifié.');
    } finally {
      setSaving(false);
    }
  };

  const keyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); suggestions.move(event.key === 'ArrowDown' ? 1 : -1); return; }
      if ((event.key === 'Enter' || event.key === 'Tab') && suggestions.activeOption) { event.preventDefault(); select(suggestions.activeOption); return; }
      if (event.key === 'Escape') { event.preventDefault(); suggestions.dismiss(); return; }
    }
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
    else if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void save(); }
  };

  const trigger = (value: '@' | '#') => { setText(appendTagTrigger(text, value)); fieldRef.current?.focus(); };

  return (
    <div data-message-edit="" className="flex w-full max-w-[min(560px,82%)] flex-col gap-2 self-end">
      <div className="relative">
        <TextArea
          ref={fieldRef}
          label="Modifier le message"
          hint="Échap pour annuler · Entrée pour enregistrer"
          value={text}
          rows={3}
          maxLength={5000}
          disabled={saving}
          aria-autocomplete="list"
          aria-controls={suggestions.open ? listId : undefined}
          aria-activedescendant={suggestions.open ? suggestionOptionId(listId, suggestions.activeIndex) : undefined}
          onChange={event => setText(event.target.value)}
          onKeyDown={keyDown}
        />
        {suggestions.open && (
          <MentionSuggestions id={listId} placement="bottom" options={suggestions.options} activeIndex={suggestions.activeIndex} disabled={saving} onSelect={select} onActiveChange={suggestions.setActiveIndex} />
        )}
      </div>
      {error && <ErrorAlert title={error} />}
      <div className="flex items-center gap-2">
        <ToolTip text="Mentionner une personne">
          <IconButton icon={AtSign} label="Mentionner une personne" title="" size="s" disabled={saving} onClick={() => trigger('@')} />
        </ToolTip>
        <ToolTip text="Lier un élément">
          <IconButton icon={Hash} label="Lier un élément" title="" size="s" disabled={saving} onClick={() => trigger('#')} />
        </ToolTip>
        <span className="flex-1" />
        <Button variant="outline" size="s" label="Annuler" disabled={saving} onClick={onCancel} />
        <Button size="s" label="Enregistrer" disabled={!canSave} loading={saving} onClick={() => void save()} />
      </div>
    </div>
  );
};
