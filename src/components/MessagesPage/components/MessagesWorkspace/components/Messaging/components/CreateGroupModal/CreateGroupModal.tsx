import React from 'react';
import { UsersRound } from 'lucide-react';
import { CancelButton, CreateButton } from '@mairie360/lib-components/primitives';

import { MessagingModalFrame } from '../MessagingModalFrame';
import { GroupDetailsFields } from './components/GroupDetailsFields';
import { GroupMemberPicker } from './components/GroupMemberPicker';
import { toggleMemberValue } from './group-members';
import type { CreateGroupPayload, MessagingContactId, MessagingConversation, MessagingSendResult } from '../../messaging-types';

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

const emptyMemberIds: MessagingContactId[] = [];

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
  const formId = React.useId();

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
  const canSubmit = name.trim().length > 0 && selectedMembers.length > 0 && !isCreating;

  const toggleMember = (memberId: MessagingContactId) => {
    if (creatingRef.current) return;
    setSelectedMemberValues((currentValues) => toggleMemberValue(currentValues, memberId));
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

  // Inputs ignore edits while the creation is pending, even if an event slips through.
  const unlessCreating = (update: (value: string) => void) => (value: string) => {
    if (!creatingRef.current) update(value);
  };

  return (
    <MessagingModalFrame
      title={title}
      subtitle={subtitle}
      formId={formId}
      onClose={onCancel}
      closeDisabled={isCreating}
      onSubmit={handleSubmit}
      footer={
        <>
          <CancelButton label={cancelLabel} onClick={onCancel} disabled={isCreating} />
          <CreateButton
            type="submit"
            form={formId}
            icon={UsersRound}
            label={isCreating ? 'Création en cours…' : submitLabel}
            disabled={!canSubmit}
            loading={isCreating}
          />
        </>
      }
    >
      {creationFailed && (
        <p role="alert" className="text-sm text-[var(--mairie-error-text)]">
          Le groupe n’a pas pu être créé. Vos saisies sont conservées ; vous pouvez réessayer.
        </p>
      )}
      <GroupDetailsFields
        nameLabel={nameLabel}
        namePlaceholder={namePlaceholder}
        descriptionLabel={descriptionLabel}
        descriptionPlaceholder={descriptionPlaceholder}
        name={name}
        description={description}
        disabled={isCreating}
        onNameChange={unlessCreating(setName)}
        onDescriptionChange={unlessCreating(setDescription)}
      />
      <GroupMemberPicker
        label={membersLabel}
        members={members}
        selectedValues={selectedMemberValues}
        search={memberSearch}
        disabled={isCreating}
        onSearchChange={unlessCreating(setMemberSearch)}
        onToggle={toggleMember}
      />
    </MessagingModalFrame>
  );
};
