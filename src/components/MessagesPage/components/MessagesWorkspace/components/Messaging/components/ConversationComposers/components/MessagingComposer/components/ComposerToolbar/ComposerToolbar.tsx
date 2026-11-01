import React from 'react';
import { AtSign, Hash, Paperclip, Smile } from 'lucide-react';

import { EmojiPicker } from './components/EmojiPicker';

export const ToolbarButton = ({ label, disabled, onClick, children }: {
  label: string; disabled: boolean; onClick: () => void; children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    className="inline-flex size-8 items-center justify-center rounded-md text-[var(--mairie-text)] transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
    onClick={onClick}
  >
    {children}
  </button>
);

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

/** Attach, @mention, #reference and emoji actions under the input. */
export const ComposerToolbar = ({
  attachLabel, emojiLabel, disabled, busy, emojiOpen,
  onAttach, onMention, onBusinessReference, onToggleEmoji, onPickEmoji,
}: ComposerToolbarProps) => (
  <div className="mt-3 flex items-center gap-2">
    <ToolbarButton label={attachLabel} disabled={disabled} onClick={onAttach}>
      <Paperclip className="size-4" strokeWidth={1.8} />
    </ToolbarButton>
    <ToolbarButton label="Mentionner un utilisateur" disabled={disabled} onClick={onMention}>
      <AtSign className="size-4" strokeWidth={1.8} />
    </ToolbarButton>
    <ToolbarButton label="Mentionner un élément métier" disabled={disabled} onClick={onBusinessReference}>
      <Hash className="size-4" strokeWidth={1.8} />
    </ToolbarButton>
    <div className="relative">
      <ToolbarButton label={emojiLabel} disabled={disabled} onClick={onToggleEmoji}>
        <Smile className="size-4" strokeWidth={1.8} />
      </ToolbarButton>
      {emojiOpen && <EmojiPicker disabled={busy} onPick={onPickEmoji} />}
    </div>
  </div>
);
