import React from 'react';
import { UsersRound } from 'lucide-react';

import { joinClasses } from './style';
import { MessagingModalFrame } from './MessagingModalFrame';
import type { CreateGroupPayload, MessagingContactId, MessagingConversation, MessagingSendResult } from './types';

export interface CreateGroupModalProps {
  isOpen: boolean;
  members: MessagingConversation[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  nameLabel?: string;
  namePlaceholder?: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  membersLabel?: string;
  cancelLabel?: string;
  submitLabel?: string;
  initialName?: string;
  initialDescription?: string;
  initialMemberIds?: MessagingContactId[];
  onCancel: () => void;
  onCreateGroup: (payload: CreateGroupPayload) => MessagingSendResult;
}

const fieldClassName =
  'h-9 w-full rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-3 text-sm text-[var(--mairie-text)] outline-none transition placeholder:text-[var(--mairie-muted)] focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20';

const buttonSecondaryClassName =
  'inline-flex h-9 items-center justify-center rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-4 text-sm font-semibold text-[var(--mairie-text)] shadow-sm transition hover:bg-[var(--mairie-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/25';

const buttonPrimaryClassName =
  'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--mairie-action-background)] px-4 text-sm font-semibold text-[var(--mairie-on-action)] shadow-sm transition hover:bg-[var(--mairie-action-hover-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mairie-accent)]/35 disabled:cursor-not-allowed disabled:bg-[var(--mairie-border)]';

const emptyMemberIds: MessagingContactId[] = [];
const normalizeSearchValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const CreateGroupModal = ({
  isOpen,
  members,
  title = 'Créer un groupe',
  subtitle = 'Créer un groupe de discussion avec plusieurs membres',
  nameLabel = 'Nom du groupe',
  namePlaceholder = 'Nom du groupe',
  descriptionLabel = 'Description (optionnel)',
  descriptionPlaceholder = 'Description du groupe',
  membersLabel = 'Membres',
  cancelLabel = 'Annuler',
  submitLabel = 'Créer le groupe',
  initialName = '',
  initialDescription = '',
  initialMemberIds = emptyMemberIds,
  onCancel,
  onCreateGroup,
}: CreateGroupModalProps) => {
  const initialMemberValues = initialMemberIds.map((memberId) => String(memberId));
  const initialMemberValuesKey = initialMemberValues.join('\u0000');
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [memberSearch, setMemberSearch] = React.useState('');
  const [selectedMemberValues, setSelectedMemberValues] = React.useState(() => initialMemberValues);
  const [isCreating, setIsCreating] = React.useState(false);
  const [creationFailed, setCreationFailed] = React.useState(false);
  const creatingRef = React.useRef(false);
  const titleId = React.useId();
  const subtitleId = React.useId();
  const nameId = React.useId();
  const descriptionId = React.useId();
  const memberSearchId = React.useId();

  React.useEffect(() => {
    if (!isOpen || creatingRef.current) return;

    setName(initialName);
    setDescription(initialDescription);
    setMemberSearch('');
    setSelectedMemberValues(initialMemberValues);
    setCreationFailed(false);
  }, [initialDescription, initialMemberValuesKey, initialName, isOpen]);

  if (!isOpen) return null;

  const selectedMembers = members.filter((member) => selectedMemberValues.includes(String(member.id)));
  const normalizedMemberSearch = normalizeSearchValue(memberSearch.trim());
  const displayedMembers = normalizedMemberSearch
    ? members.filter((member) =>
        normalizeSearchValue(`${member.name} ${member.department ?? ''}`).includes(normalizedMemberSearch)
      )
    : members;
  const canSubmit = name.trim().length > 0 && selectedMembers.length > 0 && !isCreating;

  const toggleMember = (memberId: MessagingContactId) => {
    if (creatingRef.current) return;
    const memberValue = String(memberId);

    setSelectedMemberValues((currentValues) =>
      currentValues.includes(memberValue)
        ? currentValues.filter((value) => value !== memberValue)
        : [...currentValues, memberValue]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || creatingRef.current) return;

    creatingRef.current = true;
    setCreationFailed(false);
    try {
      const result = onCreateGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds: selectedMembers.map((member) => member.id),
      });
      if (result instanceof Promise) {
        setIsCreating(true);
        void result
          .then((confirmed) => { if (confirmed === false) setCreationFailed(true); })
          .catch(() => {
            // The consumer owns service errors; retain the form and offer a retry.
            setCreationFailed(true);
          })
          .finally(() => {
            creatingRef.current = false;
            setIsCreating(false);
          });
      } else {
        if (result === false) setCreationFailed(true);
        creatingRef.current = false;
      }
    } catch {
      setCreationFailed(true);
      creatingRef.current = false;
    }
  };

  return (
    <MessagingModalFrame
      title={title}
      subtitle={subtitle}
      titleId={titleId}
      subtitleId={subtitleId}
      onClose={onCancel}
      closeDisabled={isCreating}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className={buttonSecondaryClassName} onClick={onCancel} disabled={isCreating}>
            {cancelLabel}
          </button>
          <button type="submit" className={buttonPrimaryClassName} disabled={!canSubmit}>
            <UsersRound className="size-4" strokeWidth={1.8} />
            <span>{isCreating ? 'Création en cours…' : submitLabel}</span>
          </button>
        </>
      }
    >
      {creationFailed && (
        <p role="alert" className="text-sm text-[var(--mairie-error-text)]">
          Le groupe n’a pas pu être créé. Vos saisies sont conservées ; vous pouvez réessayer.
        </p>
      )}
      <div>
        <label htmlFor={nameId} className="mb-1 block text-sm font-semibold leading-5 text-[var(--mairie-text)]">
          {nameLabel}
        </label>
        <input
          id={nameId}
          name="groupName"
          type="text"
          value={name}
          placeholder={namePlaceholder}
          className={fieldClassName}
          autoComplete="off"
          required
          disabled={isCreating}
          onChange={(event) => { if (!creatingRef.current) setName(event.target.value); }}
        />
      </div>

      <div>
        <label htmlFor={descriptionId} className="mb-1 block text-sm font-semibold leading-5 text-[var(--mairie-text)]">
          {descriptionLabel}
        </label>
        <input
          id={descriptionId}
          name="groupDescription"
          type="text"
          value={description}
          placeholder={descriptionPlaceholder}
          className={fieldClassName}
          autoComplete="off"
          disabled={isCreating}
          onChange={(event) => { if (!creatingRef.current) setDescription(event.target.value); }}
        />
      </div>

      <fieldset>
        <legend className="mb-1 block text-sm font-semibold leading-5 text-[var(--mairie-text)]">{membersLabel}</legend>
        <label htmlFor={memberSearchId} className="sr-only">
          Rechercher un contact
        </label>
        <input
          id={memberSearchId}
          name="memberSearch"
          type="search"
          value={memberSearch}
          placeholder="Rechercher un contact..."
          className={fieldClassName}
          autoComplete="off"
          disabled={isCreating}
          onChange={(event) => { if (!creatingRef.current) setMemberSearch(event.target.value); }}
        />
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-[var(--mairie-border)] bg-[var(--mairie-surface)] py-2 pr-1">
          {displayedMembers.length > 0 ? (
            displayedMembers.map((member) => {
              const checked = selectedMemberValues.includes(String(member.id));

              return (
                <label
                  key={member.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 px-5 text-sm text-[var(--mairie-text)] transition hover:bg-[var(--mairie-surface-raised)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isCreating}
                    className={joinClasses(
                      'size-4 rounded border-[var(--mairie-border)] text-[var(--mairie-accent)] focus:ring-[var(--mairie-accent)]/30',
                      checked ? 'accent-[var(--mairie-accent)]' : ''
                    )}
                    onChange={() => toggleMember(member.id)}
                  />
                  <span>
                    {member.name}
                    {member.department ? ` - ${member.department}` : ''}
                  </span>
                </label>
              );
            })
          ) : (
            <p className="px-5 py-2 text-sm text-[var(--mairie-muted)]">Aucun contact trouvé.</p>
          )}
        </div>
      </fieldset>
    </MessagingModalFrame>
  );
};
