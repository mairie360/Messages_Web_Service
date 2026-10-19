import { createSessionResumeHandler } from '@mairie360/front-kit/next';
import { sessionPeer } from '@/lib/session-peer';
export const GET = createSessionResumeHandler(sessionPeer);
