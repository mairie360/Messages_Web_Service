import { Search } from 'lucide-react';

export interface ConversationSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

/** Search box above the list; the placeholder doubles as its accessible name. */
export const ConversationSearch = ({ placeholder, value, onChange }: ConversationSearchProps) => (
  <label className="relative mt-4 block">
    <span className="sr-only">{placeholder}</span>
    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mairie-muted)]" />
    <input
      type="search"
      value={value}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] pl-10 pr-3 text-sm text-[var(--mairie-text)] outline-none transition placeholder:text-[var(--mairie-muted)] focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20"
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);
