import React from 'react';

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

/**
 * Keyboard and screen reader layer of the lib `DropdownMenu` (lib 2.2.0 renders plain `div`s, closes on
 * Escape and on an outside click, and nothing else). Shared by the « + » menu of the list (MAIR-1157) and
 * the « Plus d'actions » menu of the header (MAIR-1163):
 * - the trigger announces a menu (`aria-haspopup`, `aria-expanded`, `aria-controls`), opens on Entrée,
 *   Espace and ↓, and is not reopened by the mouse down that the lib reads as an outside click;
 * - the open menu is a `role="menu"` whose first item takes the focus; ↑ ↓ Début Fin move between the items,
 *   Entrée / Espace choose, Échap and Tab close it;
 * - when the menu closes and the focus would be lost, it returns to the trigger (before any dialog opened by
 *   the chosen item reads its opener).
 */
export function useMenuKeyboard(open: boolean, setOpen: (open: boolean) => void) {
  const menuId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const wasOpen = React.useRef(false);

  const items = React.useCallback(() => {
    const menu = triggerRef.current?.ownerDocument.getElementById(menuId);
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : [];
  }, [menuId]);

  React.useLayoutEffect(() => {
    if (open) {
      items()[0]?.focus();
    } else if (wasOpen.current) {
      const active = triggerRef.current?.ownerDocument.activeElement;
      if (!active || active === active.ownerDocument.body) triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open, items]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const triggerProps = {
    ref: triggerRef,
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: () => setOpen(!open),
    // The lib closes the menu on any document mouse down outside it: keep that one from reopening it.
    onMouseDown: (event: React.MouseEvent) => { if (open) event.stopPropagation(); },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown' && !open) {
        event.preventDefault();
        setOpen(true);
      }
    },
  };

  const menuProps = (label: string) => ({
    id: menuId,
    role: 'menu',
    'aria-label': label,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      const list = items();
      const index = list.indexOf(event.target as HTMLElement);
      const move = (next: number) => {
        event.preventDefault();
        list[(next + list.length) % list.length]?.focus();
      };
      if (event.key === 'ArrowDown') move(index + 1);
      else if (event.key === 'ArrowUp') move(index < 0 ? list.length - 1 : index - 1);
      else if (event.key === 'Home') move(0);
      else if (event.key === 'End') move(list.length - 1);
      else if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault();
        close();
      }
    },
  });

  const itemProps = (disabled = false) => ({
    role: 'menuitem',
    tabIndex: -1,
    // The lib item has `outline-none`: show the keyboard position.
    className: 'focus-visible:bg-[var(--mairie-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--mairie-accent)]',
    'aria-disabled': disabled || undefined,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (!disabled) event.currentTarget.click();
    },
  });

  return { triggerProps, menuProps, itemProps };
}
