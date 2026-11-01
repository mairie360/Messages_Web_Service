import { Checkbox, SearchField } from '@mairie360/lib-components/primitives';

import type { MessagingContactId, MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';
import { filterMembers } from '../../group-members';

export interface GroupMemberPickerProps {
  label: string;
  members: MessagingConversation[];
  selectedValues: string[];
  search: string;
  disabled: boolean;
  onSearchChange: (value: string) => void;
  onToggle: (memberId: MessagingContactId) => void;
}

/** Searchable checkbox list of the contacts that can join the group. */
export const GroupMemberPicker = ({ label, members, selectedValues, search, disabled, onSearchChange, onToggle }: GroupMemberPickerProps) => {
  const displayedMembers = filterMembers(members, search);
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-semibold leading-5 text-[var(--mairie-text)]">{label}</legend>
      <SearchField
        label="Rechercher un contact"
        name="memberSearch"
        value={search}
        placeholder="Rechercher un contact..."
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => onSearchChange(event.target.value)}
        onClear={() => onSearchChange('')}
      />
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4 py-2">
        {displayedMembers.length > 0 ? (
          displayedMembers.map((member) => (
            <Checkbox
              key={member.id}
              label={`${member.name}${member.department ? ` - ${member.department}` : ''}`}
              checked={selectedValues.includes(String(member.id))}
              disabled={disabled}
              onChange={() => onToggle(member.id)}
            />
          ))
        ) : (
          <p className="py-2 text-sm text-[var(--mairie-muted)]">Aucun contact trouvé.</p>
        )}
      </div>
    </fieldset>
  );
};
