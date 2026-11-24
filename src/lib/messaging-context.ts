import type { UrlField } from './page-url-state';

/** The project another module opens the messaging with: `?context=project-<n>` (only the id; the title is read here). */
export const PROJECT_CONTEXT = /^project-[1-9]\d{0,8}$/;
export const contextUrlField: UrlField = { defaultValue: '', accept: value => PROJECT_CONTEXT.test(value) };

/** A confirmation or a notice of the page, shown as a toast. A plain text is a success. */
export type MessagingFeedback = string | { tone: 'error' | 'info'; title: string; message: string };

export const CONTEXT_UNAVAILABLE: MessagingFeedback = {
  tone: 'error', title: 'Le projet lié n’est pas accessible', message: 'La messagerie s’ouvre sans contexte.',
};
export const CONTEXT_REMOVED: MessagingFeedback = {
  tone: 'info', title: 'Contexte retiré', message: 'Le message ne sera plus lié au projet.',
};

/** The links of a message plus the context it is written in, once each. */
export function withContextLink<T extends { id: string | number }>(links: T[] = [], context?: T): T[] {
  if (!context || links.some(link => String(link.id) === String(context.id))) return links;
  return [...links, context];
}
