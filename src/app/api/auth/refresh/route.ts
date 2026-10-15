import { createSessionRefreshProxy } from '@mairie360/front-kit/next';
import { sessionPeer } from '@/lib/session-peer';
export const POST = createSessionRefreshProxy(sessionPeer);
