import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ComposerAttachmentChips } from './ComposerAttachmentChips';

describe('ComposerAttachmentChips', () => {
  it('lists draft files and removes one', async () => {
    const onRemove = vi.fn();
    const { rerender, container } = render(<ComposerAttachmentChips attachments={[{ id: 'a1', name: 'plan.pdf' }]} disabled={false} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retirer plan.pdf' })); expect(onRemove).toHaveBeenCalledWith('a1');
    rerender(<ComposerAttachmentChips attachments={[]} disabled={false} onRemove={onRemove} />);
    expect(container).toBeEmptyDOMElement();
  });
});
