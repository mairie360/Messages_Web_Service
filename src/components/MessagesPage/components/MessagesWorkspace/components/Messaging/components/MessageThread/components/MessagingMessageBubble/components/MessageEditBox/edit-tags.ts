import { EVERYONE_LABEL } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/use-tag-suggestions';
import type { MessagingBusinessReference, MessagingMention, MessagingMessage } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';

/**
 * MAIR-1168: the tags a message already carries, as the edit box keeps them (they stay tags while the text is
 * edited): its members, groups, everyone and the elements it links.
 */
export function messageTags(message: MessagingMessage): { mentions: MessagingMention[]; references: MessagingBusinessReference[] } {
  return {
    mentions: [
      ...(message.mentionsEveryone ? [{ id: 'everyone', name: EVERYONE_LABEL, target: 'everyone' as const }] : []),
      ...(message.groupMentions ?? []).filter(group => group.name).map(group => ({ id: group.id, name: group.name!, target: 'group' as const })),
      ...(message.mentions ?? []).map(mention => ({ ...mention, target: mention.target ?? ('person' as const) })),
    ],
    references: (message.links ?? []).filter(link => link.title).map(link => ({ id: link.id, kind: link.kind, title: link.title!, href: link.url })),
  };
}

/** The tags still present in the edited text. */
export function tagsIn(text: string, tags: { mentions: MessagingMention[]; references: MessagingBusinessReference[] }) {
  return {
    mentions: tags.mentions.filter(mention => text.includes(`@${mention.name}`)),
    businessLinks: tags.references.filter(reference => text.includes(`#${reference.title}`)),
  };
}
