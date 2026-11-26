import { it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingSidebar } from './MessagingSidebar';
import { axe } from 'jest-axe';
it('matches accented names and delegates the selected conversation without inventing an entry', async () => {
  const user = userEvent.setup(); const onConversationSelect = vi.fn(); const conversations = [{ id: 1, name: 'Élodie' }, { id: 2, name: 'Anne Marie' }]; const { container } = render(<MessagingSidebar conversations={conversations} onConversationSelect={onConversationSelect} />);
  await user.type(screen.getByPlaceholderText('Rechercher une conversation'), 'elodie'); expect(screen.queryByText('Anne Marie')).not.toBeInTheDocument(); await user.click(screen.getByRole('button', { name: /Élodie/ })); expect(onConversationSelect).toHaveBeenCalledWith(conversations[0]); expect((await axe(container)).violations).toEqual([]);
});

it('MAIR-1157 filters people, groups and services as the agent types and says when nothing matches', async () => {
  const user = userEvent.setup();
  render(<MessagingSidebar conversations={[
    { id: 1, name: 'Sophie Leroy', department: 'Voirie' },
    { id: 2, name: 'Conseil municipal', kind: 'group' },
  ]} />);
  const search = screen.getByRole('searchbox', { name: 'Rechercher une conversation' });
  await user.type(search, 'voirie');
  expect(screen.getByText('Sophie Leroy')).toBeVisible(); expect(screen.queryByText('Conseil municipal')).toBeNull();
  await user.clear(search); await user.type(search, 'conseil');
  expect(screen.getByText('Conseil municipal')).toBeVisible();
  await user.clear(search); await user.type(search, 'zzz');
  expect(screen.getByText('Aucune conversation trouvée.')).toBeVisible();
});

it('MAIR-1225 RGAA 9.2: the list is no complementary landmark nested in the main area', () => {
  const { container } = render(<main><MessagingSidebar conversations={[{ id: 1, name: 'Élodie' }]} /></main>);
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(container.querySelector('aside')).toBeNull();
  expect(container.querySelector('[data-messaging-sidebar]')).not.toBeNull();
});
