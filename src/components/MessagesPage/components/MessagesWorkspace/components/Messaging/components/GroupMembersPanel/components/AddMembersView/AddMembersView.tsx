import React from 'react';
import { Button, Checkbox, DataState, SearchField } from '@mairie360/lib-components/primitives';

import type { MessagingContactId, MessagingConversation } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

export interface AddMembersViewProps {
  /** Agents that may be added: the directory without the current members. */
  candidates: MessagingConversation[];
  selectedIds: MessagingContactId[];
  onSelectedIdsChange: (ids: MessagingContactId[]) => void;
  pending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** « Ajouter des membres » (MAIR-1165): search the agents, tick them, then validate. The selection survives an error. */
export const AddMembersView = ({ candidates, selectedIds, onSelectedIdsChange, pending, onCancel, onSubmit }: AddMembersViewProps) => {
  const [query, setQuery] = React.useState('');
  const shown = candidates.filter(candidate =>
    normalize(`${candidate.name} ${candidate.department ?? ''}`).includes(normalize(query.trim())));
  const selected = new Set(selectedIds.map(String));
  const toggle = (id: MessagingContactId) => onSelectedIdsChange(selected.has(String(id))
    ? selectedIds.filter(current => String(current) !== String(id))
    : [...selectedIds, id]);

  return (
    <div className="flex flex-col gap-3">
      <SearchField label="Rechercher un agent" placeholder="Nom ou service" value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} />
      {shown.length === 0
        ? <DataState state="empty" size="s" title="Aucun agent à ajouter" />
        : (
          <fieldset className="flex flex-col gap-2" disabled={pending}>
            <legend className="sr-only">Agents à ajouter</legend>
            {shown.map(candidate => (
              <Checkbox
                key={String(candidate.id)}
                label={candidate.department ? `${candidate.name} · ${candidate.department}` : candidate.name}
                checked={selected.has(String(candidate.id))}
                onChange={() => toggle(candidate.id)}
              />
            ))}
          </fieldset>
        )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" label="Annuler" disabled={pending} onClick={onCancel} />
        <Button
          label={selectedIds.length ? `Ajouter (${selectedIds.length})` : 'Ajouter'}
          disabled={selectedIds.length === 0}
          loading={pending}
          onClick={onSubmit}
        />
      </div>
    </div>
  );
};
