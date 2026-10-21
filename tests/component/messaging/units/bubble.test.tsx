import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BubbleAttachments } from '@/components/messaging/bubble/BubbleAttachments';
import { BubbleReferences } from '@/components/messaging/bubble/BubbleReferences';
import { MentionedContent } from '@/components/messaging/bubble/MentionedContent';

const project = { id: 'p1', kind: 'project' as const, title: 'Rénovation école' };
const linked = { id: 't1', kind: 'task' as const, title: 'Devis', href: 'https://projects.example/tasks/t1' };

describe('MAIR-608 bubble sub-components', () => {
  it('MentionedContent emphasises known @mentions and #references only', () => {
    const { container } = render(<MentionedContent content="Bonjour @Marie Dubois, voir #Rénovation école et @Inconnu" mentions={[{ id: 1, name: 'Marie Dubois' }]} businessReferences={[project]} />);
    expect([...container.querySelectorAll('strong')].map(node => [node.textContent, node.dataset.mentionKind])).toEqual([
      ['@Marie Dubois', 'user'], ['#Rénovation école', 'business'],
    ]);
  });

  it('MentionedContent leaves plain or rich content untouched', () => {
    const { container, rerender } = render(<MentionedContent content="Sans mention" mentions={[]} businessReferences={[]} />);
    expect(container.querySelector('strong')).toBeNull();
    rerender(<MentionedContent content={<em>riche</em>} mentions={[{ id: 1, name: 'riche' }]} businessReferences={[]} />);
    expect(container.querySelector('em')).toHaveTextContent('riche');
  });

  it('BubbleReferences renders a link, a button or a label depending on what is available', async () => {
    const onReferenceClick = vi.fn();
    const { rerender } = render(<BubbleReferences references={[project, linked]} outgoing={false} />);
    expect(screen.getByRole('link', { name: 'Devis' })).toHaveAttribute('href', linked.href);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<BubbleReferences references={[project]} outgoing onReferenceClick={onReferenceClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Rénovation école' }));
    expect(onReferenceClick).toHaveBeenCalledWith(project);
  });

  it('BubbleAttachments downloads through the BFF when a handler is given, else links or lists the file', async () => {
    const onDownload = vi.fn();
    const files = [{ id: 'a1', name: 'plan.pdf', url: 'blob:plan' }];
    const { rerender } = render(<BubbleAttachments attachments={files} outgoing={false} downloadPending={false} onDownload={onDownload} />);
    await userEvent.click(screen.getByRole('button', { name: /plan\.pdf.*Télécharger/ }));
    expect(onDownload).toHaveBeenCalledWith(files[0]);
    rerender(<BubbleAttachments attachments={files} outgoing={false} downloadPending onDownload={onDownload} />);
    expect(screen.getByRole('button', { name: /Téléchargement…/ })).toBeDisabled();
    rerender(<BubbleAttachments attachments={files} outgoing downloadPending={false} />);
    expect(screen.getByRole('link', { name: 'plan.pdf' })).toHaveAttribute('download', 'plan.pdf');
    rerender(<BubbleAttachments attachments={[{ id: 'a2', name: 'note.txt' }]} outgoing downloadPending={false} />);
    expect(screen.getByText('note.txt')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
