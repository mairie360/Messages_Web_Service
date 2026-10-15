import axios, { type AxiosAdapter } from 'axios';
import { NextRequest } from 'next/server';
import { getBffMessage } from '@mairie360/bff-message-openapi/endpoints/bffMessage';
import { isExpiredJwt, publicOrigin } from '@mairie360/front-kit/shared';
import { proxyBffRequest } from './bff-proxy';
import { parseMessagingBootstrapReceipt, parseMessagingThreadReceipt, MESSAGES_INITIAL_UNAVAILABLE, type InitialMessagingPage } from './messaging-bootstrap-receipt';

export async function loadInitialMessagingPage(accessToken: string | undefined, requested: string): Promise<InitialMessagingPage> {
  const unavailable = { status: 'unavailable' as const, message: MESSAGES_INITIAL_UNAVAILABLE };
  const origin = publicOrigin(process.env.MESSAGE_FRONT_URL);
  if (!origin || isExpiredJwt(accessToken)) return unavailable;
  const adapter: AxiosAdapter = async config => {
    const target = new URL(axios.getUri(config), origin);
    if (config.method?.toUpperCase() !== 'GET' || target.origin !== origin) throw new Error(MESSAGES_INITIAL_UNAVAILABLE);
    const request = new NextRequest(target, { method: 'GET', headers: { Accept: 'application/json', Cookie: `accessToken=${encodeURIComponent(accessToken!)}` } });
    const response = await proxyBffRequest(request, { params: Promise.resolve({ path: target.pathname.split('/').filter(Boolean).map(decodeURIComponent) }) });
    if (!response.ok) { await response.body?.cancel(); throw new Error(MESSAGES_INITIAL_UNAVAILABLE); }
    return { data: await response.json(), status: response.status, statusText: response.statusText, headers: {}, config };
  };
  try {
    const api = getBffMessage(axios.create({ adapter }));
    const data = parseMessagingBootstrapReceipt((await api.getMessagingBootstrap()).data);
    const thread = requested ? parseMessagingThreadReceipt((await api.getConversationsConversationIdMessages(encodeURIComponent(requested))).data, requested) : undefined;
    return { status: 'confirmed', data, requested, ...(thread ? { thread } : {}) };
  } catch { return unavailable; }
}
