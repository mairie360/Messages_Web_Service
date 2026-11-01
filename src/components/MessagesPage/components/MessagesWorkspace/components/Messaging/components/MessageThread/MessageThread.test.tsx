import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

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
