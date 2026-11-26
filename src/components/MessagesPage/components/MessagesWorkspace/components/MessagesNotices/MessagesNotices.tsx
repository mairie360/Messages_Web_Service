'use client';

import { Alert, ErrorAlert } from "@mairie360/lib-components/primitives";

type MessagesNoticesProps = {
  /** « Suppression de la conversation en cours… » while a deletion is pending. */
  deletingConversation: boolean;
  /** Refused action; closable. */
  error: string | null;
  onDismissError?: () => void;
  /** Refused synchronisation; cleared by the next successful read, so not closable. */
  syncError: string | null;
  /** Waiting text while a thread opens. */
  pendingText?: string | null;
};

/** Operation statuses and errors above the module, as lib alerts (MAIR-854, Figma bricks MessagesError / MessagesOperationStatus). */
export function MessagesNotices({ deletingConversation, error, onDismissError, syncError, pendingText }: MessagesNoticesProps) {
  return (
    <>
      {/* RGAA 7.5: the statuses go into a live region mounted before them, so their text is announced (a region
          inserted together with its message is not). `empty:-mb-3` cancels the stack gap while it is empty. */}
      <div role="status" aria-live="polite" data-messages-status="" className="flex shrink-0 flex-col gap-3 empty:-mb-3">
        {deletingConversation && <Alert tone="info" size="s" role="none" title="Suppression de la conversation en cours…" />}
        {pendingText && <Alert tone="info" size="s" role="none" title={pendingText} />}
      </div>
      {error && <ErrorAlert size="s" title={error} onDismiss={onDismissError} className="shrink-0" />}
      {syncError && <ErrorAlert size="s" title={syncError} className="shrink-0" />}
    </>
  );
}
