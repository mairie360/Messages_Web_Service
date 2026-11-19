'use client';

import { Button, StatusPill } from "@mairie360/lib-components/primitives";
import type { MessageStreamState } from "@/lib/message-stream";
import { RECEPTION_STATES } from "./reception-status";

type ReceptionStatusProps = {
  state: MessageStreamState;
  /** Restarts the reception; only offered while it is delayed. */
  onRetry: () => void;
};

/** Automatic reception state as a lib StatusPill, with a retry while delayed (MAIR-860). */
export function ReceptionStatus({ state, onRetry }: ReceptionStatusProps) {
  const { label, tone } = RECEPTION_STATES[state];
  return (
    <div className="messages-reception-status flex flex-wrap items-center gap-3" role="status" aria-live="polite">
      <StatusPill label={label} tone={tone} dot />
      {state === "offline" && (
        <Button variant="ghost" tone="primary" label="Réessayer la réception" onClick={onRetry} className="min-h-11" />
      )}
    </div>
  );
}
