import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessagingContactAvatar } from '@/components/messaging/MessagingContactAvatar';
it('derives contact initials and exposes its presence label, while preserving meaningful image text', () => {
  const { rerender } = render(<MessagingContactAvatar name="Anne Marie" presence="online" />); expect(screen.getByText('AM')).toBeVisible(); expect(screen.getByLabelText('En ligne')).toBeInTheDocument(); rerender(<MessagingContactAvatar name="Anne Marie" src="/anne.png" />); expect(screen.getByRole('img', { name: 'Anne Marie' })).toBeInTheDocument();
});
