import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { NewConversationMenu } from './NewConversationMenu';

const setup = () => {
  const onNewMessageClick = vi.fn(), onCreateGroupClick = vi.fn();
  const view = render(
    <div>
      <NewConversationMenu label="Nouvelle conversation" newMessageLabel="Nouveau message" createGroupLabel="Créer un groupe"
        onNewMessageClick={onNewMessageClick} onCreateGroupClick={onCreateGroupClick} />
      <button type="button">Ailleurs</button>
    </div>,
  );
  return { ...view, onNewMessageClick, onCreateGroupClick, trigger: screen.getByRole('button', { name: 'Nouvelle conversation' }) };
};

describe('NewConversationMenu', () => {
  it('MAIR-1157 is a lib icon button described by its « Nouvelle conversation » tooltip and announcing a menu', async () => {
    const { trigger, container } = setup();
    expect(trigger).toHaveAttribute('data-m360-component', expect.stringContaining('IconButton'));
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    trigger.focus();
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Nouvelle conversation');
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip', { hidden: true }).id);
    expect((await axe(container)).violations).toEqual([]);
  });

  it('MAIR-1225 opens its tooltip below the « + », aligned on its right edge, so the page header never cuts it', () => {
    const { trigger } = setup();
    trigger.focus();
    const bubble = screen.getByRole('tooltip', { hidden: true }).closest('[data-placement]');
    expect(bubble).toHaveAttribute('data-placement', 'bottom');
    expect(bubble).toHaveAttribute('data-align', 'end');
  });

  it('MAIR-1157 opens from the keyboard, moves with the arrows and chooses with Entrée', async () => {
    const user = userEvent.setup();
    const { trigger, onCreateGroupClick } = setup();
    trigger.focus();
    await user.keyboard('{Enter}');
    const menu = screen.getByRole('menu', { name: 'Nouvelle conversation' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
    const [newMessage, createGroup] = screen.getAllByRole('menuitem');
    expect(newMessage).toHaveFocus();
    await user.keyboard('{ArrowDown}'); expect(createGroup).toHaveFocus();
    await user.keyboard('{ArrowDown}'); expect(newMessage).toHaveFocus();
    await user.keyboard('{ArrowUp}'); expect(createGroup).toHaveFocus();
    await user.keyboard('{Home}'); expect(newMessage).toHaveFocus();
    await user.keyboard('{End}'); expect(createGroup).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onCreateGroupClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('MAIR-1157 closes on Échap and on Tab with the focus back on the « + », and opens with ↓', async () => {
    const user = userEvent.setup();
    const { trigger, onNewMessageClick } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Nouveau message' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull(); expect(trigger).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).toBeNull(); expect(trigger).toHaveFocus();
    expect(onNewMessageClick).not.toHaveBeenCalled();
  });

  it('MAIR-1157 toggles with the mouse and closes on an outside click', async () => {
    const user = userEvent.setup();
    const { trigger, onNewMessageClick } = setup();
    await user.click(trigger); expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(trigger); expect(screen.queryByRole('menu')).toBeNull();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Ailleurs' }));
    expect(screen.queryByRole('menu')).toBeNull();
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Nouveau message' }));
    expect(onNewMessageClick).toHaveBeenCalledTimes(1);
  });
});

describe('NewConversationMenu MAIR-1158', () => {
  it('draws message-square-plus and users through the lib Icon in front of the entries', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Nouveau message' }).querySelector('svg')?.getAttribute('class')).toContain('lucide-message-square-plus');
    expect(screen.getByRole('menuitem', { name: 'Créer un groupe' }).querySelector('svg')?.getAttribute('class')).toContain('lucide-users');
    expect(trigger.querySelector('svg')?.getAttribute('class')).toContain('lucide-plus');
  });
  // MAIR-1253 (design-match, Figma F1): the « + » of the list is an outlined square.
  it('MAIR-1253 draws the « + » with a border', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Nouvelle conversation' })).toHaveClass('border');
  });
});
