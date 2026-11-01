import { createSessionRefreshProxy } from '@mairie360/lib-components/next';
import { sessionPeer } from '@/lib/session-peer';
export const POST = createSessionRefreshProxy(sessionPeer);
