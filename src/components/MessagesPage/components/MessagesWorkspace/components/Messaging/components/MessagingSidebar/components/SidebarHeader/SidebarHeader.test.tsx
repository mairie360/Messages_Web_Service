import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SidebarHeader } from './SidebarHeader';

describe('SidebarHeader', () => {
  it('shows only the shortcuts it is given', async () => {
    const onNewMessageClick = vi.fn();
    const { rerender } = render(<SidebarHeader title="Messagerie" newMessageLabel="Nouveau message" createGroupLabel="Créer un groupe" />);
    expect(screen.getByRole('heading', { name: 'Messagerie' })).toBeVisible(); expect(screen.queryByRole('button')).toBeNull();
    rerender(<SidebarHeader title="Messagerie" newMessageLabel="Nouveau message" createGroupLabel="Créer un groupe" onNewMessageClick={onNewMessageClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau message' })); expect(onNewMessageClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Créer un groupe' })).toBeNull();
  });
});
