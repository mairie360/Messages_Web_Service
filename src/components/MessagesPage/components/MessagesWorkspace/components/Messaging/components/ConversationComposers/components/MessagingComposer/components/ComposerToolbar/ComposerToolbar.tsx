import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { IconButton, ToolTip, icons } from '@mairie360/lib-components/primitives';

import { EmojiPicker } from './components/EmojiPicker';

/** MAIR-1158: every toolbar action is a lib `IconButton` with an explicit glyph, described by its lib `ToolTip`. */
export const ToolbarButton = ({ label, tooltip, icon, disabled, onClick }: {
  label: string; tooltip?: string; icon: LucideIcon; disabled: boolean; onClick: () => void;
}) => (
  <ToolTip text={tooltip ?? label}>
    <IconButton icon={icon} label={label} title="" size="s" disabled={disabled} onClick={onClick} />
  </ToolTip>
);

export const MENTION_LABEL = 'Mentionner une personne';
export const LINK_LABEL = 'Lier un élément';
/** Tooltips of the artifact: what `@` and `#` can tag. */
export const MENTION_TOOLTIP = 'Mentionner une personne, tout le monde ou un groupe (@)';
export const LINK_TOOLTIP = 'Lier un projet, un événement, une tâche ou un dossier (#)';

export interface ComposerToolbarProps {
  attachLabel: string;
  emojiLabel: string;
  /** Toolbar buttons are disabled (busy draft or read-only thread). */
  disabled: boolean;
  /** Emoji buttons only follow the busy state. */
  busy: boolean;
  emojiOpen: boolean;
  onAttach: () => void;
  onMention: () => void;
  onBusinessReference: () => void;
  onToggleEmoji: () => void;
  onPickEmoji: (emoji: string) => void;
  /** The send button, at the end of the bar after a spacer. */
  children?: React.ReactNode;
}

/**
 * The bar under the text field: attach (file-up), mention (user-round, `@`), link (link, `#`) and emoji (smile-plus),
 * then the send button pushed to the right.
 */
export const ComposerToolbar = ({
  attachLabel, emojiLabel, disabled, busy, emojiOpen,
  onAttach, onMention, onBusinessReference, onToggleEmoji, onPickEmoji, children,
}: ComposerToolbarProps) => (
  <div className="flex items-center gap-0.5">
    <ToolbarButton label={attachLabel} icon={icons['file-up']} disabled={disabled} onClick={onAttach} />
    <ToolbarButton label={MENTION_LABEL} tooltip={MENTION_TOOLTIP} icon={icons['user-round']} disabled={disabled} onClick={onMention} />
    <ToolbarButton label={LINK_LABEL} tooltip={LINK_TOOLTIP} icon={icons.link} disabled={disabled} onClick={onBusinessReference} />
    <div className="relative">
      <ToolbarButton label={emojiLabel} icon={icons['smile-plus']} disabled={disabled} onClick={onToggleEmoji} />
      {emojiOpen && <EmojiPicker disabled={busy} onPick={onPickEmoji} />}
    </div>
    <span className="flex-1" aria-hidden="true" />
    {children}
  </div>
);
