import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConversationSearch } from './ConversationSearch';

describe('ConversationSearch', () => {
  it('MAIR-1157 is the lib search field named « Rechercher une conversation », reporting each keystroke and the clear', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ConversationSearch placeholder="Rechercher une conversation" value="" onChange={onChange} />);
    const field = screen.getByRole('searchbox', { name: 'Rechercher une conversation' });
    expect(field.closest('[data-m360-component~="SearchField"]')).not.toBeNull();
    await userEvent.type(field, 'M'); expect(onChange).toHaveBeenCalledWith('M');
    rerender(<ConversationSearch placeholder="Rechercher une conversation" value="Ma" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
