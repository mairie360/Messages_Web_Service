import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultMessagingConversations } from '@tests/component/messaging/messaging-fixtures';
const [marie, pierre] = defaultMessagingConversations;

import { RecipientSelect, recipientOptions } from './RecipientSelect';

describe('RecipientSelect', () => {
  it('lists « Name - Department » behind its placeholder', async () => {
    const onChange = vi.fn();
    render(<RecipientSelect label="Destinataire" placeholder="Choisir un contact" contacts={[marie, { id: 9, name: 'Sans service' }]} value="" disabled={false} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: 'Destinataire' });
    expect([...select.querySelectorAll('option')].map(option => option.textContent)).toEqual(['Choisir un contact', 'Marie Dubois - Finances', 'Sans service']);
    await userEvent.selectOptions(select, 'marie-dubois'); expect(onChange).toHaveBeenCalledWith('marie-dubois');
    expect(recipientOptions([pierre])).toEqual([{ value: 'pierre-martin', label: 'Pierre Martin - Urbanisme' }]);
  });
});
