// Small DTO readers shared by server bootstrap and the existing browser client.
// Objects are rebuilt from declared fields; unknown response data is never serialized.
export type Reader<T = unknown> = (value: unknown) => T;
const invalid = (): never => { throw new Error('Les données reçues ne correspondent pas au contrat publié.'); };
export const text: Reader<string> = value => typeof value === 'string' ? value : invalid();
export const number: Reader<number> = value => typeof value === 'number' && Number.isFinite(value) ? value : invalid();
export const optional = (read: Reader): Reader => value => value === undefined ? undefined : read(value);
export const union = (...readers: Reader[]): Reader => value => {
  for (const read of readers) { try { return read(value); } catch { /* The next declared scalar alternative may match. */ } }
  return invalid();
};
export const choice = (values: readonly unknown[]): Reader => value => values.includes(value) ? value : invalid();
export const list = (read: Reader): Reader => value => Array.isArray(value) ? value.map(read) : invalid();
export const record = (fields: Readonly<Record<string, Reader>>): Reader => value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const source = value as Record<string, unknown>;
  return Object.fromEntries(Object.entries(fields).flatMap(([name, read]) => {
    const field = read(Object.hasOwn(source, name) ? source[name] : undefined);
    return field === undefined ? [] : [[name, field]];
  }));
};
