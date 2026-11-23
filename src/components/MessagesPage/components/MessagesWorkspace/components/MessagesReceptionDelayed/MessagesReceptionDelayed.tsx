'use client';

import { WarningAlert } from "@mairie360/lib-components/primitives";
import type { MessageStreamState } from "@/lib/message-stream";

type MessagesReceptionDelayedProps = {
  state: MessageStreamState;
  /** Restarts the reception. */
  onRetry: () => void;
};

/**
 * MAIR-1161 (Figma F2 · Réception retardée): nothing is shown while the reception works (« Réception automatique
 * active » is gone); a small lib warning `Alert` above the module only once the real-time connection is lost. The
 * polite live region stays mounted, so the banner is announced when it appears without taking the focus. On
 * reconnection the controller reads the missed messages again (stream cursor + refresh) and the banner goes away.
 */
export function MessagesReceptionDelayed({ state, onRetry }: MessagesReceptionDelayedProps) {
  return (
    <div className="messages-reception-delayed shrink-0 empty:-mb-3" aria-live="polite">
      {state === "offline" && (
        <WarningAlert
          size="s"
          title="Réception des messages retardée"
          description="Les nouveaux messages s’afficheront dès le retour de la connexion."
          actionLabel="Réessayer la réception"
          onAction={onRetry}
        />
      )}
    </div>
  );
}
