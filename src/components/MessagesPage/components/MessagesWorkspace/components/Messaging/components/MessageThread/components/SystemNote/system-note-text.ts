import type { MessagingContactId, MessagingSystemEvent } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

const sameUser = (left: MessagingContactId | undefined, right: MessagingContactId | undefined) =>
  left !== undefined && right !== undefined && String(left).replace(/^user-/, '') === String(right).replace(/^user-/, '');

/** « A », « A et B », « A, B et C ». */
export const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;

/**
 * MAIR-1165: the sentence of a membership change, from the agent's point of view (« Vous avez ajouté Sophie Leroy
 * au groupe. », « Paul Martin a retiré vous du groupe. » is said « Paul Martin vous a retiré du groupe. »).
 */
export function systemNoteText(event: MessagingSystemEvent, currentUserId?: MessagingContactId): string {
  const byMe = sameUser(event.actorId, currentUserId);
  const actor = byMe ? 'Vous' : event.actorName?.trim() || 'Un ancien membre';
  const targetsMe = event.userIds.some(id => sameUser(id, currentUserId));
  const others = joinNames(event.userNames.filter((_, index) => !sameUser(event.userIds[index], currentUserId)).filter(Boolean)) ||
    (event.userIds.length > 1 ? `${event.userIds.length} membres` : 'un membre');
  switch (event.action) {
    case 'members_added':
      if (targetsMe && !byMe) return `${actor} vous a ajouté au groupe.`;
      return `${actor} ${byMe ? 'avez' : 'a'} ajouté ${others} au groupe.`;
    case 'member_removed':
      if (targetsMe && !byMe) return `${actor} vous a retiré du groupe.`;
      return `${actor} ${byMe ? 'avez' : 'a'} retiré ${others} du groupe.`;
    default:
      return `${actor} ${byMe ? 'avez' : 'a'} quitté le groupe.`;
  }
}
