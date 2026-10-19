import { NextRequest, NextResponse } from 'next/server';
import { proxyPublishedBffRequest, readSessionCookies, validSessionToken, type SessionProxyConfig } from '@mairie360/front-kit/next';

function failure(status: number, message: string, cookies: string[] = []) {
  const response = NextResponse.json({ error: { message } }, { status, headers: { 'Cache-Control': 'no-store' } });
  for (const cookie of cookies) response.headers.append('Set-Cookie', cookie);
  return response;
}

/** Preserve the published session renewal protocol; only the declared stream has a long-lived body. */
export async function proxyMessageStream(request: NextRequest, config: SessionProxyConfig) {
  if (!config.paths['/stream']?.get || !config.paths['/me']?.get) return failure(404, 'La réception automatique est indisponible.');
  // The published proxy validates origins, strips untrusted auth, and handles
  // renewal/rotation. Reuse it for a bounded authenticated read before streaming.
  const probe = await proxyPublishedBffRequest(request, ['me'], config);
  if (!probe.ok) return probe;
  const renewedCookies = probe.headers.getSetCookie();
  const receipt = await probe.json().catch(() => null);
  const identity = receipt?.currentUser?.id;
  if ((typeof identity !== 'string' && typeof identity !== 'number') || String(identity).trim() === '') return failure(502, 'La connexion à la messagerie n’a pas pu être vérifiée.', renewedCookies);
  const access = readSessionCookies(probe)?.accessToken ?? request.cookies.get('accessToken')?.value;
  if (!validSessionToken(access)) return failure(401, 'Votre session a expiré. Veuillez vous reconnecter.', renewedCookies);

  const base = config.baseUrl().trim();
  let target: URL;
  try {
    target = new URL(`${base.replace(/\/+$/, '')}/stream`);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('invalid service');
  } catch { return failure(503, 'La réception automatique n’est pas configurée.', renewedCookies); }
  const headers = new Headers({ Accept: 'text/event-stream', Authorization: `Bearer ${access}` });
  const cursor = request.headers.get('last-event-id');
  if (cursor && cursor.length <= 512 && !/[\u0000-\u001f\u007f]/.test(cursor)) headers.set('Last-Event-ID', cursor);
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  if (request.signal.aborted) abort();
  // The current server may send its first keep-alive after 15s. Bound only the
  // handshake; the body remains open until the browser disconnects.
  const timeout = setTimeout(abort, 30_000);
  const cleanup = () => { clearTimeout(timeout); request.signal.removeEventListener('abort', abort); };
  try {
    const upstream = await fetch(target, { method: 'GET', headers, redirect: 'manual', cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (!upstream.ok) {
      await upstream.body?.cancel();
      cleanup();
      return failure(upstream.status >= 400 ? upstream.status : 503, 'La réception automatique est temporairement indisponible.', renewedCookies);
    }
    if (!upstream.body || upstream.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'text/event-stream') {
      await upstream.body?.cancel();
      cleanup();
      return failure(502, 'La réception automatique a renvoyé une réponse invalide.', renewedCookies);
    }
    const reader = upstream.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(output) {
        try {
          const result = await reader.read();
          if (result.done) { cleanup(); output.close(); }
          else output.enqueue(result.value);
        } catch (error) { cleanup(); output.error(error); }
      },
      async cancel() { controller.abort(); cleanup(); await reader.cancel().catch(() => undefined); },
    });
    const responseHeaders = new Headers({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
    responseHeaders.set('X-Mairie360-Stream-Account', encodeURIComponent(String(identity)));
    for (const cookie of renewedCookies) responseHeaders.append('Set-Cookie', cookie);
    return new Response(stream, { headers: responseHeaders });
  } catch {
    controller.abort(); cleanup();
    return failure(502, 'La réception automatique a été interrompue.', renewedCookies);
  }
}
