import React from 'react';

import type {
  MessagingBusinessReference,
  MessagingMention,
  MessagingMentionSuggestions,
  MessagingTagSuggestionSources,
} from './messaging-types';

/** Label of the « everyone » tag in the text. */
export const EVERYONE_LABEL = 'tout le monde';
/** Time the agent may keep typing before the suggestions are asked. */
export const TAG_SUGGESTION_DEBOUNCE_MS = 150;

export interface TagMatch {
  trigger: '@' | '#';
  /** Index of the trigger in the text. */
  start: number;
  query: string;
}

export interface TagOption {
  key: string;
  section: string;
  mention?: MessagingMention;
  reference?: MessagingBusinessReference;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * The tag being typed at the end of the text. `@` stops at a space (names are chosen in the list); `#` titles may
 * contain spaces. A tag already chosen is followed by a space, so what is typed after it is plain text (frozen tag).
 */
export function tagMatchAt(value: string): TagMatch | null {
  const mention = value.match(/(^|\s)@([^\s@#]*)$/);
  if (mention?.index !== undefined) return { trigger: '@', start: mention.index + mention[1].length, query: mention[2] };
  const link = value.match(/(^|\s)#([^#@\r\n]*)$/);
  if (link?.index !== undefined) return { trigger: '#', start: link.index + link[1].length, query: link[2].trim() };
  return null;
}

/** The sections of `@`: Tout le monde · Groupes et services · Personnes. */
export function mentionOptions(suggestions: MessagingMentionSuggestions): TagOption[] {
  return [
    ...(suggestions.everyone ? [{ key: 'everyone', section: 'Tout le monde', mention: { id: 'everyone', name: EVERYONE_LABEL, target: 'everyone' as const, description: 'Tous les membres de la conversation' } }] : []),
    ...suggestions.groups.map(group => ({ key: `group:${String(group.id)}`, section: 'Groupes et services', mention: { id: group.id, name: group.name, target: 'group' as const, description: 'Groupe ou service' } })),
    ...suggestions.people.map(person => ({ key: `person:${String(person.id)}`, section: 'Personnes', mention: { id: person.id, name: person.name, target: 'person' as const } })),
  ];
}

/** Local suggestions, used without a remote source (the directory and the business references already loaded). */
export function localOptions(match: TagMatch, mentions: MessagingMention[], references: MessagingBusinessReference[]): TagOption[] {
  const query = normalize(match.query);
  if (match.trigger === '@') {
    return mentions.filter(mention => normalize(mention.name).includes(query)).slice(0, 6)
      .map(mention => ({ key: `${mention.kind ?? 'direct'}:${String(mention.id)}`, section: mention.kind === 'group' ? 'Groupes et services' : 'Personnes', mention }));
  }
  return references.filter(reference => normalize(reference.title).includes(query))
    .map(reference => ({ key: `reference:${String(reference.id)}`, section: 'Éléments', reference }));
}

/**
 * MAIR-1166: the suggestions of the tag being typed (combobox / listbox state). Remote sources are asked after
 * `TAG_SUGGESTION_DEBOUNCE_MS`, older requests aborted; local options otherwise. ↑ ↓ move the active option, Échap
 * dismisses the list until the agent types again, an empty list closes it.
 */
export function useTagSuggestions(
  value: string,
  local: { mentions: MessagingMention[]; references: MessagingBusinessReference[] },
  sources: MessagingTagSuggestionSources = {},
) {
  const match = tagMatchAt(value);
  const remote = match ? (match.trigger === '@' ? sources.mentions : sources.links) : undefined;
  const requestKey = match && remote ? `${match.trigger}${match.query}` : '';
  const [remoteOptions, setRemoteOptions] = React.useState<{ key: string; options: TagOption[] }>({ key: '', options: [] });
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [dismissedFor, setDismissedFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!requestKey || !match || !remote) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const request = match.trigger === '@'
        ? sources.mentions!(match.query, controller.signal).then(mentionOptions)
        : sources.links!(match.query, controller.signal).then(references => references.map(reference => ({ key: `reference:${String(reference.id)}`, section: 'Éléments', reference })));
      request
        .then(options => { if (!controller.signal.aborted) setRemoteOptions({ key: requestKey, options }); })
        .catch(() => { if (!controller.signal.aborted) setRemoteOptions({ key: requestKey, options: [] }); });
    }, TAG_SUGGESTION_DEBOUNCE_MS);
    return () => { window.clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one request per typed tag
  }, [requestKey]);

  const options = !match ? [] : remote
    ? (remoteOptions.key === requestKey ? remoteOptions.options : [])
    : localOptions(match, local.mentions, local.references);
  const open = options.length > 0 && dismissedFor !== value;
  const active = open ? Math.min(activeIndex, options.length - 1) : -1;

  React.useEffect(() => { setActiveIndex(0); }, [requestKey, match?.query, match?.trigger]);

  return {
    match,
    options,
    open,
    activeIndex: active,
    activeOption: active >= 0 ? options[active] : undefined,
    move: (delta: number) => setActiveIndex(current => (Math.max(0, Math.min(options.length - 1, current)) + delta + options.length) % options.length),
    setActiveIndex,
    dismiss: () => setDismissedFor(value),
  };
}

/** Replace the typed tag with the chosen label, followed by a space: what is typed next is not part of the tag. */
export const insertTag = (value: string, match: TagMatch, label: string) => `${value.slice(0, match.start)}${match.trigger}${label} `;

/** The label a tag shows in the text. */
export const tagLabel = (option: TagOption) => (option.mention ? option.mention.name : option.reference?.title ?? '');

/** The `@` / `#` buttons add the trigger at the end of the text, after a space. */
export const appendTagTrigger = (value: string, trigger: '@' | '#') =>
  `${value}${value.trim() && !/\s$/.test(value) ? ` ${trigger}` : trigger}`;
