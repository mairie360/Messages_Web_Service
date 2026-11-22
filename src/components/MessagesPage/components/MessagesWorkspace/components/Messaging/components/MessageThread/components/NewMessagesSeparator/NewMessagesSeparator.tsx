import { Divider } from '@mairie360/lib-components/primitives';

/** « Nouveaux messages » before the first unread message (MAIR-1160, Figma F3): the lib `Divider` with its label. */
export const NewMessagesSeparator = () => (
  <Divider label="Nouveaux messages" data-new-messages-separator="" />
);
