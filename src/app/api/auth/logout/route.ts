import { NextResponse } from 'next/server';
import { clearAccessTokenCookie } from '@/lib/access-token-cookie';

// Déconnexion locale : BFF Message étant le seul BFF du front, la session se termine en effaçant le
// cookie `accessToken`, sans appel réseau. La page rechargée est ensuite redirigée vers Login.
export function POST() {
  return clearAccessTokenCookie(new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } }));
}
