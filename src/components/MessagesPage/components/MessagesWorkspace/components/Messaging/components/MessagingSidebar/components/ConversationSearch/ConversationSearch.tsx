import { SearchField } from '@mairie360/lib-components/primitives';

export interface ConversationSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Search above the list (MAIR-1157, Figma F9): lib `SearchField` filtering as the agent types, with the lib
 * clear button. The placeholder is also its accessible name (label kept for assistive technology only).
 */
export const ConversationSearch = ({ placeholder, value, onChange }: ConversationSearchProps) => (
  <SearchField
    className="mt-4"
    label={<span className="sr-only">{placeholder}</span>}
    placeholder={placeholder}
    value={value}
    size="s"
    onChange={(event) => onChange(event.target.value)}
    onClear={() => onChange('')}
  />
);
