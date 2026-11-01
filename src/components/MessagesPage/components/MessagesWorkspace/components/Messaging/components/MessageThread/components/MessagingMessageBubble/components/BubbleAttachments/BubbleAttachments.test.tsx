import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BubbleAttachments } from './BubbleAttachments';

describe('BubbleAttachments', () => {
  it('downloads through the BFF when a handler is given, else links or lists the file', async () => {
    const onDownload = vi.fn();
    const files = [{ id: 'a1', name: 'plan.pdf', url: 'blob:plan' }];
    const { rerender } = render(<BubbleAttachments attachments={files} outgoing={false} downloadPending={false} onDownload={onDownload} />);
    await userEvent.click(screen.getByRole('button', { name: /plan\.pdf.*Télécharger/ })); expect(onDownload).toHaveBeenCalledWith(files[0]);
    rerender(<BubbleAttachments attachments={files} outgoing={false} downloadPending onDownload={onDownload} />);
    expect(screen.getByRole('button', { name: /Téléchargement…/ })).toBeDisabled();
    rerender(<BubbleAttachments attachments={files} outgoing downloadPending={false} />);
    expect(screen.getByRole('link', { name: 'plan.pdf' })).toHaveAttribute('download', 'plan.pdf');
    rerender(<BubbleAttachments attachments={[{ id: 'a2', name: 'note.txt' }]} outgoing downloadPending={false} />);
    expect(screen.getByText('note.txt')).toBeVisible(); expect(screen.queryByRole('link')).toBeNull();
  });
});
