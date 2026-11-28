import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BubbleAttachments, formatAttachmentSize } from './BubbleAttachments';

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
  // MAIR-1253 (design-match, Figma F2): a file card with its size and a download icon instead of the word.
  it('MAIR-1253 shows the size of the file and a download icon', () => {
    render(<BubbleAttachments attachments={[{ id: 'a1', name: 'Dossier subvention.pdf', size: 2516582, url: '/files/a1' }]} outgoing={false} downloadPending={false} />);
    const link = screen.getByRole('link', { name: /Dossier subvention\.pdf/ });
    expect(link).toHaveTextContent('2,4 Mo');
    expect(link.querySelectorAll('svg').length).toBe(2);
  });
  it('MAIR-1253 formats file sizes in French units', () => {
    expect(formatAttachmentSize(undefined)).toBeUndefined();
    expect(formatAttachmentSize(-1)).toBeUndefined();
    expect(formatAttachmentSize(512)).toBe('512 o');
    expect(formatAttachmentSize(1536)).toBe('1,5 Ko');
    expect(formatAttachmentSize(2516582)).toBe('2,4 Mo');
  });
});
