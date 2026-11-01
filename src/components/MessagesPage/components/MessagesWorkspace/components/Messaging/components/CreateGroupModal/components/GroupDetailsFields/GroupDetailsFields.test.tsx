import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GroupDetailsFields } from './GroupDetailsFields';

describe('GroupDetailsFields', () => {
  it('requires the name and keeps the description optional', async () => {
    const onNameChange = vi.fn(); const onDescriptionChange = vi.fn();
    render(<GroupDetailsFields nameLabel="Nom du groupe" namePlaceholder="Nom" descriptionLabel="Description (optionnel)" descriptionPlaceholder="Description" name="" description="" disabled={false} onNameChange={onNameChange} onDescriptionChange={onDescriptionChange} />);
    expect(screen.getByRole('textbox', { name: /Nom du groupe/ })).toBeRequired(); expect(screen.getByRole('textbox', { name: 'Description (optionnel)' })).not.toBeRequired();
    await userEvent.type(screen.getByRole('textbox', { name: /Nom du groupe/ }), 'C'); await userEvent.type(screen.getByRole('textbox', { name: 'Description (optionnel)' }), 'D');
    expect(onNameChange).toHaveBeenCalledWith('C'); expect(onDescriptionChange).toHaveBeenCalledWith('D');
  });
});
