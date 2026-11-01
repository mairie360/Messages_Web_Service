export type SseFrame = { data: string; id?: string; event: string; retry?: number };

/** Incremental UTF-8 event framing, including CRLF split across network chunks. */
export function createSseParser(receive: (frame: SseFrame) => void, maximum = 65_536) {
  let buffer = '';
  let data: string[] = [];
  let id: string | undefined;
  let event = 'message';
  let retry: number | undefined;
  let size = 0;
  const line = (value: string) => {
    size += value.length;
    if (size > maximum) throw new Error('Le flux de réception est trop volumineux.');
    if (value === '') {
      if (data.length || id !== undefined || retry !== undefined) receive({ data: data.join('\n'), id, event, retry });
      data = []; id = undefined; event = 'message'; retry = undefined; size = 0;
      return;
    }
    if (value.startsWith(':')) return;
    const colon = value.indexOf(':');
    const field = colon < 0 ? value : value.slice(0, colon);
    const payload = colon < 0 ? '' : value.slice(colon + 1).replace(/^ /, '');
    if (field === 'data') data.push(payload);
    else if (field === 'id' && !payload.includes('\u0000') && payload.length <= 512) id = payload;
    else if (field === 'event') event = payload || 'message';
    else if (field === 'retry' && /^\d{1,8}$/.test(payload)) retry = Math.min(15_000, Math.max(1_000, Number(payload)));
  };
  return {
    push(text: string) {
      buffer += text;
      let start = 0;
      for (let index = 0; index < buffer.length; index += 1) {
        const character = buffer[index];
        if (character !== '\r' && character !== '\n') continue;
        if (character === '\r' && index === buffer.length - 1) break;
        line(buffer.slice(start, index));
        if (character === '\r' && buffer[index + 1] === '\n') index += 1;
        start = index + 1;
      }
      buffer = buffer.slice(start);
      if (buffer.length + size > maximum) throw new Error('Le flux de réception est trop volumineux.');
    },
    end() {
      if (buffer.endsWith('\r')) line(buffer.slice(0, -1));
      buffer = ''; data = []; id = undefined; retry = undefined; size = 0;
    },
  };
}
