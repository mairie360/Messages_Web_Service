import React from 'react';

export interface HeaderIconButtonProps {
  label: string;
  expanded?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const HeaderIconButton = ({ label, expanded, onClick, children }: HeaderIconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-expanded={expanded}
    className="inline-flex size-9 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
    onClick={onClick}
  >
    {children}
  </button>
);
