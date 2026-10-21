import { SelectField } from '@mairie360/lib-components/primitives';

import type { MessagingConversation } from '../types';

export interface RecipientSelectProps {
  label: string;
  placeholder: string;
  contacts: MessagingConversation[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** "Name - Department" for each contact of the directory. */
export const recipientOptions = (contacts: MessagingConversation[]) =>
  contacts.map((contact) => ({
    value: String(contact.id),
    label: `${contact.name}${contact.department ? ` - ${contact.department}` : ''}`,
  }));

export const RecipientSelect = ({ label, placeholder, contacts, value, disabled, onChange }: RecipientSelectProps) => (
  <SelectField
    label={label}
    placeholder={placeholder}
    options={recipientOptions(contacts)}
    value={value}
    disabled={disabled}
    onChange={onChange}
  />
);
