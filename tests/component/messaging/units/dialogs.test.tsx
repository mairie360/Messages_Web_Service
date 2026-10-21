import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupDetailsFields } from '@/components/messaging/group/GroupDetailsFields';
import { GroupMemberPicker } from '@/components/messaging/group/GroupMemberPicker';
import { MessageTextArea } from '@/components/messaging/new-message/MessageTextArea';
import { RecipientSelect, recipientOptions } from '@/components/messaging/new-message/RecipientSelect';
import { defaultMessagingConversations } from '../messaging-fixtures';

const [marie, pierre] = defaultMessagingConversations;

describe('MAIR-608 dialog sub-components', () => {
  it('RecipientSelect lists "Name - Department" behind its placeholder', async () => {
    const onChange = vi.fn();
    render(<RecipientSelect label="Destinataire" placeholder="Choisir un contact" contacts={[marie, { id: 9, name: 'Sans service' }]} value="" disabled={false} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: 'Destinataire' });
    expect([...select.querySelectorAll('option')].map(option => option.textContent)).toEqual(['Choisir un contact', 'Marie Dubois - Finances', 'Sans service']);
    await userEvent.selectOptions(select, 'marie-dubois');
    expect(onChange).toHaveBeenCalledWith('marie-dubois');
    expect(recipientOptions([pierre])).toEqual([{ value: 'pierre-martin', label: 'Pierre Martin - Urbanisme' }]);
  });

  it('MessageTextArea is labelled and reports its value', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<MessageTextArea label="Message" placeholder="Tapez" value="" disabled={false} onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'A');
    expect(onChange).toHaveBeenCalledWith('A');
    rerender(<MessageTextArea label="Message" placeholder="Tapez" value="A" disabled onChange={onChange} />);
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled();
  });

  it('GroupDetailsFields requires the name and keeps the description optional', async () => {
    const onNameChange = vi.fn(); const onDescriptionChange = vi.fn();
    render(<GroupDetailsFields nameLabel="Nom du groupe" namePlaceholder="Nom" descriptionLabel="Description (optionnel)" descriptionPlaceholder="Description"
      name="" description="" disabled={false} onNameChange={onNameChange} onDescriptionChange={onDescriptionChange} />);
    expect(screen.getByRole('textbox', { name: /Nom du groupe/ })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Description (optionnel)' })).not.toBeRequired();
    await userEvent.type(screen.getByRole('textbox', { name: /Nom du groupe/ }), 'C');
    await userEvent.type(screen.getByRole('textbox', { name: 'Description (optionnel)' }), 'D');
    expect(onNameChange).toHaveBeenCalledWith('C');
    expect(onDescriptionChange).toHaveBeenCalledWith('D');
  });

  it('GroupMemberPicker filters contacts without accents, toggles one and says when none match', async () => {
    const onToggle = vi.fn(); const onSearchChange = vi.fn();
    const props = { label: 'Membres', members: [marie, pierre], selectedValues: ['pierre-martin'], disabled: false, onToggle, onSearchChange };
    const { rerender } = render(<GroupMemberPicker {...props} search="" />);
    expect(screen.getByRole('group', { name: 'Membres' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Pierre Martin - Urbanisme' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Marie Dubois - Finances' }));
    expect(onToggle).toHaveBeenCalledWith('marie-dubois');
    rerender(<GroupMemberPicker {...props} search="FINANCÉS" />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    rerender(<GroupMemberPicker {...props} search="Inconnu" />);
    expect(screen.getByText('Aucun contact trouvé.')).toBeVisible();
  });
});
