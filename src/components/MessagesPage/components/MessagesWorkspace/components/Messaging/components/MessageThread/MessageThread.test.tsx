import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { DataState } from '@mairie360/lib-components/primitives';
import { MessageThread } from './MessageThread';

const threadProps = { emptyStateLabel: 'Choisissez un fil', mentionOptions: [], businessReferenceOptions: [] };

describe('MessageThread', () => {
  it('distinguishes no conversation, an empty one and its messages, and forwards its ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { rerender } = render(<MessageThread ref={ref} hasConversation={false} messages={[]} {...threadProps} />);
    expect(screen.getByText('Choisissez un fil')).toBeVisible();
    rerender(<MessageThread ref={ref} hasConversation messages={[]} {...threadProps} />);
    expect(screen.getByText('Aucun message dans cette conversation.')).toBeVisible();
    rerender(<MessageThread ref={ref} hasConversation messages={[{ id: 'm1', content: 'Bonjour', direction: 'incoming' }]} {...threadProps} />);
    expect(screen.getByText('Bonjour').closest('[data-messaging-message-id="m1"]')).not.toBeNull();
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('MessageThread empty states', () => {
  it('MAIR-870 renders a text placeholder as a muted lib Text and a DataState as is, centred', () => {
    const base = { messages: [], mentionOptions: [], businessReferenceOptions: [] };
    const { rerender } = render(<MessageThread {...base} hasConversation={false} emptyStateLabel="Sélectionnez une conversation pour commencer." />);
    const text = screen.getByText('Sélectionnez une conversation pour commencer.');
    expect(text.getAttribute('data-m360-component')).toContain('Text');
    expect(text.parentElement?.className).toContain('justify-center');
    rerender(<MessageThread {...base} hasConversation={false} emptyStateLabel={<DataState state="empty" title="Aucune conversation" />} />);
    expect(screen.getByText('Aucune conversation').closest('[data-m360-component~="DataState"]')).not.toBeNull();
    rerender(<MessageThread {...base} hasConversation emptyStateLabel="" />);
    expect(screen.getByText('Aucun message dans cette conversation.').getAttribute('data-m360-component')).toContain('Text');
  });
});
