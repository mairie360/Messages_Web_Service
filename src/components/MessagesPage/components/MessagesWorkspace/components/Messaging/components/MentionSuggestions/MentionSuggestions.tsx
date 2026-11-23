import React from 'react';
import { AtSign, Users } from 'lucide-react';
import { Icon, Text, icons } from '@mairie360/lib-components/primitives';

import { BusinessReferenceIcon, businessReferenceKindLabel } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/BusinessReferenceIcon';
import type { TagOption } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/use-tag-suggestions';

export interface MentionSuggestionsProps {
  /** Id of the listbox, referenced by the `aria-controls` of the text field (combobox). */
  id: string;
  options: TagOption[];
  activeIndex: number;
  disabled?: boolean;
  /** `top` above the text field (composer), `bottom` below it (edit box). */
  placement?: 'top' | 'bottom';
  onSelect: (option: TagOption) => void;
  onActiveChange: (index: number) => void;
}

/** Id of an option, for the `aria-activedescendant` of the text field. */
export const suggestionOptionId = (listId: string, index: number) => `${listId}-option-${index}`;

const optionDetail = (option: TagOption) => {
  if (option.reference) {
    return [businessReferenceKindLabel(option.reference), option.reference.description].filter(Boolean).join(' · ');
  }
  return option.mention?.description ?? (option.mention?.kind === 'group' ? 'Groupe' : 'Personne');
};

const OptionIcon = ({ option }: { option: TagOption }) => {
  if (option.reference) return <BusinessReferenceIcon reference={option.reference} />;
  if (option.mention?.target === 'everyone') return <Icon icon={Users} size="s" />;
  if (option.mention?.target === 'group' || option.mention?.kind === 'group') return <Icon icon={icons['building-2']} size="s" />;
  return <Icon icon={AtSign} size="s" />;
};

/**
 * MAIR-1166 (Figma F12): the suggestions of `@` (Tout le monde · Groupes et services · Personnes) and of `#`
 * (projects, events, tasks with their kind and detail), as a listbox grouped by section. The keyboard stays in the
 * text field (↑ ↓ Entrée Tab Échap, `aria-activedescendant`); a click chooses without taking the focus.
 */
export const MentionSuggestions = ({
  id, options, activeIndex, disabled = false, placement = 'top', onSelect, onActiveChange,
}: MentionSuggestionsProps) => {
  if (options.length === 0) return null;
  const sections = options.reduce<Array<{ name: string; items: Array<{ option: TagOption; index: number }> }>>((list, option, index) => {
    const section = list.find(item => item.name === option.section) ?? list[list.push({ name: option.section, items: [] }) - 1];
    section.items.push({ option, index });
    return list;
  }, []);

  return (
    <div
      id={id}
      role="listbox"
      aria-label={options[0].reference ? 'Éléments à lier' : 'Personnes et groupes à mentionner'}
      className={`absolute ${placement === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} left-0 z-30 max-h-72 w-full max-w-[440px] overflow-y-auto rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-1 text-sm text-[var(--mairie-text)] shadow-lg`}
    >
      {sections.map(section => (
        <div key={section.name} role="group" aria-labelledby={`${id}-${section.items[0].index}-section`}>
          <Text as="div" id={`${id}-${section.items[0].index}-section`} size="xs" weight="semibold" tone="muted" className="px-3 pb-1 pt-2" uppercase>
            {section.name}
          </Text>
          {section.items.map(({ option, index }) => (
            <button
              key={option.key}
              id={suggestionOptionId(id, index)}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              disabled={disabled}
              title={option.reference?.title}
              className={`flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-left transition hover:bg-[var(--mairie-background)] ${index === activeIndex ? 'bg-[var(--mairie-accent-surface)]' : ''}`}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => onActiveChange(index)}
              onClick={() => onSelect(option)}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--mairie-surface-raised)] text-[var(--mairie-accent)]">
                <OptionIcon option={option} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{option.reference ? `#${option.reference.title}` : `@${option.mention?.name}`}</span>
                <span className="block truncate text-xs text-[var(--mairie-muted)]">{optionDetail(option)}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
