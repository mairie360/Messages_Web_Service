import { readPageUrlState, urlText } from './page-url-state';
export const messagingUrlSchema = { conversation: urlText(200) };
export function serverMessagingSelection(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, values] of Object.entries(params)) for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) query.append(key, value);
  return readPageUrlState(query.toString(), messagingUrlSchema).conversation;
}
