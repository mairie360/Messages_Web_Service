/** A piece of a search excerpt, `match` when it is one of the highlighted occurrences. */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * MAIR-1164: cut an excerpt around the matches the BFF located (UTF-16 offsets, as JavaScript counts them).
 * Overlapping, out-of-range or empty matches are ignored rather than trusted.
 */
export function highlightSegments(excerpt: string, highlights: Array<{ start: number; length: number }>): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  [...highlights]
    .filter(({ start, length }) => Number.isInteger(start) && Number.isInteger(length) && start >= 0 && length > 0)
    .sort((left, right) => left.start - right.start)
    .forEach(({ start, length }) => {
      const end = Math.min(excerpt.length, start + length);
      if (start < cursor || start >= end) return;
      if (start > cursor) segments.push({ text: excerpt.slice(cursor, start), match: false });
      segments.push({ text: excerpt.slice(start, end), match: true });
      cursor = end;
    });
  if (cursor < excerpt.length || segments.length === 0) segments.push({ text: excerpt.slice(cursor), match: false });
  return segments;
}
