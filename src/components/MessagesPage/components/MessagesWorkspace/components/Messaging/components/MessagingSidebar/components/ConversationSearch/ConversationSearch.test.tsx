import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConversationSearch } from './ConversationSearch';

describe('ConversationSearch', () => {
  it('is named by its placeholder and reports typing', async () => {
    const onChange = vi.fn();
    render(<ConversationSearch placeholder="Rechercher un contact..." value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher un contact...' }), 'M'); expect(onChange).toHaveBeenCalledWith('M');
  });
});
