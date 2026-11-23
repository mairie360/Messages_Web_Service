import { ArrowDown } from 'lucide-react';
import { Button } from '@mairie360/lib-components/primitives';

import { newMessagesLabel } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-model';

export interface UnreadMessagesPillProps {
  /** Unread messages not seen yet. */
  count: number;
  visible: boolean;
  onClick: () => void;
}

/**
 * Floating neutral pill at the bottom of the thread (MAIR-1160, Figma F3): « N nouveaux messages », a lib `Button`
 * that brings the agent to the last message. It sticks to the bottom of the scrolling thread; its polite live
 * region stays mounted so each new count is announced without moving the focus.
 */
export const UnreadMessagesPill = ({ count, visible, onClick }: UnreadMessagesPillProps) => (
  <div className="pointer-events-none sticky bottom-3 z-10 flex h-0 items-end justify-center !mt-0" role="status" aria-live="polite">
    {visible && count > 0 && (
      <Button
        variant="outline"
        tone="neutral"
        size="s"
        icon={ArrowDown}
        label={newMessagesLabel(count)}
        className="pointer-events-auto rounded-full bg-[var(--mairie-surface)] shadow-[var(--mairie-shadow)]"
        onClick={onClick}
      />
    )}
  </div>
);
