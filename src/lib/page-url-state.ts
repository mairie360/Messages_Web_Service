export type UrlField = { defaultValue: string; accept: (value: string) => boolean };
export type UrlSchema = Readonly<Record<string, UrlField>>;

export function readPageUrlState(search: string, schema: UrlSchema): Record<string, string> {
  const params = new URLSearchParams(search);
  return Object.fromEntries(Object.entries(schema).map(([key, field]) => {
    const values = params.getAll(key);
    return [key, values.length === 1 && field.accept(values[0]) ? values[0] : field.defaultValue];
  }));
}

/** Preserve links to an event/project and other query parameters owned by the caller. */
export function pageStateUrl(href: string, patch: Record<string, string>, schema: UrlSchema): string {
  const url = new URL(href);
  for (const [key, value] of Object.entries(patch)) {
    const field = schema[key];
    if (!field) continue;
    if (!field.accept(value) || value === field.defaultValue) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export const urlChoice = (values: readonly string[], defaultValue = values[0]): UrlField => ({ defaultValue, accept: value => values.includes(value) });
export const urlText = (maximum = 200): UrlField => ({ defaultValue: '', accept: value => value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value) });
export const urlPage: UrlField = { defaultValue: '1', accept: value => /^[1-9]\d{0,5}$/.test(value) };
export const urlDate: UrlField = {
  defaultValue: '',
  accept: value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  },
};
