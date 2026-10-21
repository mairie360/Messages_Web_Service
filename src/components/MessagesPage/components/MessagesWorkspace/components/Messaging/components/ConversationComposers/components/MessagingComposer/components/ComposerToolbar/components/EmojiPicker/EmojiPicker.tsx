import { systemEmojiOptions } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/components/ConversationComposers/components/MessagingComposer/composer-text';

export interface EmojiPickerProps {
  disabled: boolean;
  onPick: (emoji: string) => void;
}

/** Fixed grid of system emojis, rendered with the platform colour emoji font. */
export const EmojiPicker = ({ disabled, onPick }: EmojiPickerProps) => (
  <div
    className="absolute bottom-[calc(100%+8px)] left-0 z-20 grid gap-1 rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-2 shadow-lg"
    style={{
      gridTemplateColumns: 'repeat(4, 2rem)',
      width: '9.25rem',
    }}
  >
    {systemEmojiOptions.map((emoji) => (
      <button
        key={emoji}
        type="button"
        aria-label={`Ajouter ${emoji}`}
        disabled={disabled}
        className="flex size-8 items-center justify-center rounded-md transition hover:bg-[var(--mairie-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/30"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
          fontSize: '1.25rem',
          lineHeight: 1,
        }}
        onClick={() => onPick(emoji)}
      >
        {emoji}
      </button>
    ))}
  </div>
);
