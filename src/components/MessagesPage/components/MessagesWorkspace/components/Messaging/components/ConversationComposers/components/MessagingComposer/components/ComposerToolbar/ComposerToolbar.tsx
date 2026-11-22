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
}

/** Attach (file-up), @mention (at-sign), #link (hash) and emoji (smile-plus) actions under the input. */
export const ComposerToolbar = ({
  attachLabel, emojiLabel, disabled, busy, emojiOpen,
  onAttach, onMention, onBusinessReference, onToggleEmoji, onPickEmoji,
}: ComposerToolbarProps) => (
  <div className="mt-3 flex items-center gap-2">
    <ToolbarButton label={attachLabel} icon={icons['file-up']} disabled={disabled} onClick={onAttach} />
    <ToolbarButton label={MENTION_LABEL} tooltip={`${MENTION_LABEL} (@)`} icon={icons['at-sign']} disabled={disabled} onClick={onMention} />
    <ToolbarButton label={LINK_LABEL} tooltip={`${LINK_LABEL} : projet, tâche, dossier, événement (#)`} icon={icons.hash} disabled={disabled} onClick={onBusinessReference} />
    <div className="relative">
      <ToolbarButton label={emojiLabel} icon={icons['smile-plus']} disabled={disabled} onClick={onToggleEmoji} />
      {emojiOpen && <EmojiPicker disabled={busy} onPick={onPickEmoji} />}
    </div>
  </div>
);
