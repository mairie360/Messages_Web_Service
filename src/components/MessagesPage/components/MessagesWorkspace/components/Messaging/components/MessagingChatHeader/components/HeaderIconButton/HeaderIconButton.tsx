import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { IconButton, ToolTip } from '@mairie360/lib-components/primitives';

export interface HeaderIconButtonProps {
  label: string;
  icon: LucideIcon;
  /** Shown in the tooltip; the label by default. */
  tooltip?: string;
  /**
   * MAIR-1158: an action that is not available yet (« bientôt disponible »). The button stays focusable so the
   * keyboard reaches its tooltip, is announced as unavailable (`aria-disabled`) and does nothing.
   */
  unavailable?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

/** Icon action of the conversation header (MAIR-1158): lib `IconButton` described by a lib `ToolTip`. */
export const HeaderIconButton = React.forwardRef<HTMLButtonElement, HeaderIconButtonProps>(function HeaderIconButton(
  { label, icon, tooltip, unavailable = false, expanded, onClick }, ref,
) {
  return (
    <ToolTip text={tooltip ?? label}>
      <IconButton
        ref={ref}
        icon={icon}
        label={label}
        title=""
        aria-expanded={expanded}
        aria-disabled={unavailable || undefined}
        className={unavailable ? 'cursor-not-allowed opacity-50' : undefined}
        onClick={unavailable ? undefined : onClick}
      />
    </ToolTip>
  );
});
