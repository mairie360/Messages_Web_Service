export interface ReadFailureAlertProps {
  message: string;
}

/** Shown under the header when the visible messages could not be marked as read. */
export const ReadFailureAlert = ({ message }: ReadFailureAlertProps) => (
  <p role="alert" className="border-b border-[var(--mairie-border)] px-4 py-2 text-sm text-[var(--mairie-error-text)] sm:px-5">{message}</p>
);
