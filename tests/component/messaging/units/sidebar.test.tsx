import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationList } from '@/components/messaging/sidebar/ConversationList';
import { ConversationSearch } from '@/components/messaging/sidebar/ConversationSearch';
import { SidebarHeader } from '@/components/messaging/sidebar/SidebarHeader';
import { defaultMessagingConversations } from '../messaging-fixtures';

const [marie, pierre] = defaultMessagingConversations;

describe('MAIR-608 sidebar sub-components', () => {
  it('SidebarHeader shows only the shortcuts it is given', async () => {
    const onNewMessageClick = vi.fn();
    const { rerender } = render(<SidebarHeader title="Messagerie" newMessageLabel="Nouveau message" createGroupLabel="Créer un groupe" />);
    expect(screen.getByRole('heading', { name: 'Messagerie' })).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<SidebarHeader title="Messagerie" newMessageLabel="Nouveau message" createGroupLabel="Créer un groupe" onNewMessageClick={onNewMessageClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau message' }));
    expect(onNewMessageClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Créer un groupe' })).toBeNull();
  });

  it('ConversationSearch is named by its placeholder and reports typing', async () => {
    const onChange = vi.fn();
    render(<ConversationSearch placeholder="Rechercher un contact..." value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher un contact...' }), 'M');
    expect(onChange).toHaveBeenCalledWith('M');
  });

  it('ConversationList marks the active thread, selects one and shows the empty label', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<ConversationList conversations={[marie, pierre]} activeConversationId="pierre-martin" emptyLabel="Rien" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Marie Dubois'));
    expect(onSelect).toHaveBeenCalledWith(marie);
    rerender(<ConversationList conversations={[]} emptyLabel="Rien" />);
    expect(screen.getByText('Rien')).toBeVisible();
  });
});
