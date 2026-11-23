import React from 'react';
import { Plus, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  Icon,
  IconButton,
  ToolTip,
  icons,
} from '@mairie360/lib-components/primitives';

import { useMenuKeyboard } from '../../../../../../use-menu-keyboard';

export interface NewConversationMenuProps {
  label: string;
  newMessageLabel: string;
  createGroupLabel: string;
  onNewMessageClick?: () => void;
  onCreateGroupClick?: () => void;
}

/**
 * « + » of the list (MAIR-1157, Figma F5 / F6): lib `IconButton` with the « Nouvelle conversation » tooltip,
 * opening a lib `DropdownMenu` with « Nouveau message » and « Créer un groupe » (only the entries it is given).
 */
export const NewConversationMenu = ({
  label, newMessageLabel, createGroupLabel, onNewMessageClick, onCreateGroupClick,
}: NewConversationMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const { triggerProps, menuProps, itemProps } = useMenuKeyboard(open, setOpen);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <ToolTip text={label}>
        <IconButton icon={Plus} label={label} title="" {...triggerProps} />
      </ToolTip>
      <DropdownMenuContent align="end" className="w-56" {...menuProps(label)}>
        {onNewMessageClick && (
          <DropdownMenuItem {...itemProps()} onClick={onNewMessageClick}>
            <Icon icon={icons['message-square-plus']} size="s" />{newMessageLabel}
          </DropdownMenuItem>
        )}
        {onCreateGroupClick && (
          <DropdownMenuItem {...itemProps()} onClick={onCreateGroupClick}>
            <Icon icon={Users} size="s" />{createGroupLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
