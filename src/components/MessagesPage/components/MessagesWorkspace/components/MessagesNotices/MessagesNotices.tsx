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
      {deletingConversation && (
        <Alert tone="info" size="s" role="status" title="Suppression de la conversation en cours…" className="shrink-0" />
      )}
      {error && <ErrorAlert size="s" title={error} onDismiss={onDismissError} className="shrink-0" />}
      {syncError && <ErrorAlert size="s" title={syncError} className="shrink-0" />}
      {pendingText && <Alert tone="info" size="s" role="status" title={pendingText} className="shrink-0" />}
    </>
  );
}
