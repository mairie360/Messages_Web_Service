import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
vi.mock('@/lib/auth-session', () => ({ useAuthSession: () => ({ user: { name: 'Agent' }, isAdmin: false }), logoutAndReload: vi.fn() }));
vi.mock('@/lib/navigation', () => ({ getActiveFrontHrefs: () => ({ messages: '/' }) }));

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('binds the session to the shared shell around the messaging content', () => {
    render(<AppShell activeItem="messages"><p>Contenu</p></AppShell>);
    expect(screen.getByText('Contenu')).toBeInTheDocument(); expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
