import { Check } from 'lucide-react';
import { Button, Icon, Text, icons } from '@mairie360/lib-components/primitives';

import type { MessagingSendStatus } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface MessageSendStatusProps {
  status: MessagingSendStatus;
  onRetry?: () => void;
}

/**
 * Under my bubbles (MAIR-1162, Figma F4): « Envoyé » (check), « Envoi… » (loader-circle turning only without
 * prefers-reduced-motion) or « Non envoyé · Réessayer l'envoi » (circle-alert + a lib link button with refresh-cw).
 * The thread announces each change in its own polite live region.
 */
export const MessageSendStatus = ({ status, onRetry }: MessageSendStatusProps) => (
  <span data-send-status={status} className="mt-1 mr-1 inline-flex items-center gap-1 self-end">
    {status === 'sent' && (
      <>
        <Icon icon={Check} size="xs" className="text-[var(--mairie-muted)]" />
        <Text as="span" size="xs" tone="muted">Envoyé</Text>
      </>
    )}
    {status === 'sending' && (
      <>
        <Icon icon={icons['loader-circle']} size="xs" className="text-[var(--mairie-muted)] motion-safe:animate-spin" />
        <Text as="span" size="xs" tone="muted">Envoi…</Text>
      </>
    )}
    {status === 'failed' && (
      <>
        <Icon icon={icons['circle-alert']} size="xs" className="text-[var(--mairie-error-text)]" />
        <Text as="span" size="xs" tone="danger">Non envoyé ·</Text>
        {onRetry && (
          <Button variant="link" tone="primary" size="xs" icon={icons['refresh-cw']} label="Réessayer l’envoi" onClick={onRetry} />
        )}
      </>
    )}
  </span>
);
