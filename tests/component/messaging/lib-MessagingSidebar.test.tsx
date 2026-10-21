import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagingSidebar } from '@/components/messaging/MessagingSidebar';
import { axe } from 'jest-axe';
it('matches accented names and delegates the selected conversation without inventing an entry', async () => {
  const user = userEvent.setup(); const onConversationSelect = vi.fn(); const conversations = [{ id: 1, name: 'Élodie' }, { id: 2, name: 'Anne Marie' }]; const { container } = render(<MessagingSidebar conversations={conversations} onConversationSelect={onConversationSelect} />);
  await user.type(screen.getByPlaceholderText('Rechercher un contact...'), 'elodie'); expect(screen.queryByText('Anne Marie')).not.toBeInTheDocument(); await user.click(screen.getByRole('button', { name: /Élodie/ })); expect(onConversationSelect).toHaveBeenCalledWith(conversations[0]); expect((await axe(container)).violations).toEqual([]);
});
