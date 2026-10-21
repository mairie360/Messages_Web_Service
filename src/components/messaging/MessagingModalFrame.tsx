import React from 'react';
import { X } from 'lucide-react';

import { joinClasses } from './style';

interface MessagingModalFrameProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  titleId: string;
  subtitleId: string;
  className?: string;
  closeDisabled?: boolean;
  onClose: () => void;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

export const MessagingModalFrame = ({
  title,
  subtitle,
  children,
  footer,
  titleId,
  subtitleId,
  className,
  closeDisabled = false,
  onClose,
  onSubmit,
}: MessagingModalFrameProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--mairie-overlay-background)]/35 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    aria-describedby={subtitle ? subtitleId : undefined}
  >
    <form
      className={joinClasses(
        'flex max-h-[calc(100vh-2rem)] w-full max-w-[512px] flex-col overflow-hidden rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-background)] text-[var(--mairie-text)] shadow-xl',
        className
      )}
      onSubmit={onSubmit}
    >
      <div className="flex items-start justify-between gap-5 px-6 pb-2 pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-bold leading-7 text-[var(--mairie-text)]">
            {title}
          </h2>
          {subtitle && (
            <p id={subtitleId} className="mt-0.5 text-sm leading-5 text-[var(--mairie-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Fermer"
          disabled={closeDisabled}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--mairie-muted)] transition hover:bg-[var(--mairie-surface-raised)] hover:text-[var(--mairie-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
          onClick={onClose}
        >
          <X className="size-5" strokeWidth={1.8} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-2">{children}</div>

      <div className="flex shrink-0 justify-end gap-2 px-6 py-5">{footer}</div>
    </form>
  </div>
);
