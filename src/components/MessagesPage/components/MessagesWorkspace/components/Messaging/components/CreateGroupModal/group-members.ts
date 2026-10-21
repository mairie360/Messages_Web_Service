import type { MessagingContactId, MessagingConversation } from '../../messaging-types';

const normalizeSearchValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Contacts whose name or department contains the search, ignoring accents and case. */
export const filterMembers = (members: MessagingConversation[], search: string) => {
  const normalizedSearch = normalizeSearchValue(search.trim());
  return normalizedSearch
    ? members.filter((member) =>
        normalizeSearchValue(`${member.name} ${member.department ?? ''}`).includes(normalizedSearch)
      )
    : members;
};

/** Add or remove one member id (compared as strings). */
export const toggleMemberValue = (values: string[], memberId: MessagingContactId) => {
  const memberValue = String(memberId);
  return values.includes(memberValue)
    ? values.filter((value) => value !== memberValue)
    : [...values, memberValue];
};
