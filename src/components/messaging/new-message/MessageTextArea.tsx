import React from 'react';
import { Field } from '@mairie360/lib-components/primitives';

export interface MessageTextAreaProps {
  label: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** Multi-line message under the lib Field label (the lib has no text area preset). */
export const MessageTextArea = ({ label, placeholder, value, disabled, onChange }: MessageTextAreaProps) => {
  const id = React.useId();
  return (
    <Field htmlFor={id} label={label} disabled={disabled}>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="h-[100px] w-full resize-none rounded-md border border-[var(--mairie-control-border)] bg-[var(--mairie-surface)] px-3 py-2 text-sm text-[var(--mairie-text)] outline-none transition placeholder:text-[var(--mairie-muted)] focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20"
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
};
