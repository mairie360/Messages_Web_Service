import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { GroupMemberPicker } from './GroupMemberPicker';

describe('GroupMemberPicker', () => {
  it('filters contacts without accents, toggles one and says when none match', async () => {
    const onToggle = vi.fn(); const onSearchChange = vi.fn();
    const props = { label: 'Membres', members: [marie, pierre], selectedValues: ['pierre-martin'], disabled: false, onToggle, onSearchChange };
    const { rerender } = render(<GroupMemberPicker {...props} search="" />);
    expect(screen.getByRole('group', { name: 'Membres' })).toBeVisible(); expect(screen.getByRole('checkbox', { name: 'Pierre Martin - Urbanisme' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Marie Dubois - Finances' })); expect(onToggle).toHaveBeenCalledWith('marie-dubois');
    rerender(<GroupMemberPicker {...props} search="FINANCÉS" />); expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    rerender(<GroupMemberPicker {...props} search="Inconnu" />); expect(screen.getByText('Aucun contact trouvé.')).toBeVisible();
  });
});
