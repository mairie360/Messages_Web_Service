import React from 'react';
import { Button } from '@mairie360/lib-components/primitives';

/** MAIR-1170 (Figma F16): the reactions offered. */
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🙏', '✅'] as const;

const EMOJI_NAMES: Record<string, string> = {
  '👍': 'pouce levé', '❤️': 'cœur', '😂': 'rire', '🎉': 'fête', '👀': 'yeux', '🙏': 'merci', '✅': 'validé',
};

export interface ReactionPickerProps {
  outgoing: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

/**
 * MAIR-1170 (Figma F16): the emoji choice of « Réagir » and « Ajouter une réaction », lib `Button`s in a group that
 * takes the focus; ← → move, Échap closes it.
 */
export const ReactionPicker = ({ outgoing, onPick, onClose }: ReactionPickerProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { ref.current?.querySelector('button')?.focus(); }, []);
  const keyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(ref.current?.querySelectorAll('button') ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  };
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Choisir une réaction"
      onKeyDown={keyDown}
      className={`mt-1 flex gap-0.5 rounded-full border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-1 shadow-[var(--mairie-shadow)] ${outgoing ? 'self-end' : ''}`}
    >
      {REACTION_EMOJIS.map(emoji => (
        <Button key={emoji} variant="ghost" size="s" aria-label={`Réagir avec ${EMOJI_NAMES[emoji]}`} onClick={() => onPick(emoji)}>
          <span aria-hidden="true">{emoji}</span>
        </Button>
      ))}
    </div>
  );
};
