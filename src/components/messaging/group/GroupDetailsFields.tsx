import { TextField } from '@mairie360/lib-components/primitives';

export interface GroupDetailsFieldsProps {
  nameLabel: string;
  namePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  name: string;
  description: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const GroupDetailsFields = ({
  nameLabel, namePlaceholder, descriptionLabel, descriptionPlaceholder,
  name, description, disabled, onNameChange, onDescriptionChange,
}: GroupDetailsFieldsProps) => (
  <>
    <TextField
      label={nameLabel}
      name="groupName"
      value={name}
      placeholder={namePlaceholder}
      autoComplete="off"
      required
      disabled={disabled}
      onChange={(event) => onNameChange(event.target.value)}
    />
    <TextField
      label={descriptionLabel}
      name="groupDescription"
      value={description}
      placeholder={descriptionPlaceholder}
      autoComplete="off"
      disabled={disabled}
      onChange={(event) => onDescriptionChange(event.target.value)}
    />
  </>
);
