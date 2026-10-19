import { createSessionResumeHandler } from '@mairie360/lib-components/next';
import { sessionPeer } from '@/lib/session-peer';
export const GET = createSessionResumeHandler(sessionPeer);
