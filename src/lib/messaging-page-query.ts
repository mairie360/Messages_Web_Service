import { readPageUrlState, urlText } from './page-url-state';
import { contextUrlField } from './messaging-context';
/** `message` is the message a global search result points at, revealed once its conversation is open. */
export const messagingUrlSchema = { conversation: urlText(200), message: urlText(200), context: contextUrlField };
/**
 * A global search link names its target by number (`?conversation=5&message=7`) while the page and BFF_Message use
 * public ids (`conversation-5`, `message-7`): a bare positive number becomes the public id, anything else is kept.
 */
export function publicMessagingId(kind: 'conversation' | 'message', value: string): string {
  return /^[1-9]\d{0,15}$/.test(value) ? `${kind}-${value}` : value;
}
/** The conversation and message a page URL points at, as public ids (`''` when absent). */
export function messagingUrlTarget(state: Record<string, string>) {
  return { conversation: publicMessagingId('conversation', state.conversation ?? ''), message: publicMessagingId('message', state.message ?? '') };
}
export function serverMessagingSelection(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, values] of Object.entries(params)) for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) query.append(key, value);
  return messagingUrlTarget(readPageUrlState(query.toString(), messagingUrlSchema)).conversation;
}
