import React from 'react';

import type { MessagingBusinessReference, MessagingMention } from '@/components/MessagesPage/components/MessagesWorkspace/components/Messaging/messaging-types';
import { mentionKindsIn, splitOnMentions } from '../../bubble-model';

export interface MentionedContentProps {
  content: React.ReactNode;
  mentions: MessagingMention[];
  businessReferences: MessagingBusinessReference[];
}

/** Message text with its known @mentions and #references emphasised. */
export const MentionedContent = ({ content, mentions, businessReferences }: MentionedContentProps) => {
  if (typeof content !== 'string') return <div>{content}</div>;
  const mentionKinds = mentionKindsIn(content, mentions, businessReferences);
  if (mentionKinds.size === 0) return <div>{content}</div>;

  return (
    <div>
      {splitOnMentions(content, Array.from(mentionKinds.keys())).map((part, index) => {
        const mentionKind = mentionKinds.get(part);
        if (!mentionKind) return part;
        return (
          <strong key={`${part}-${index}`} className="font-bold underline underline-offset-2" data-mention-kind={mentionKind}>
            {part}
          </strong>
        );
      })}
    </div>
  );
};
