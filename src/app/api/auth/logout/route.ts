import { NextRequest } from 'next/server';
import { userBffRequest } from '@/lib/user-bff-proxy';

export function POST(request: NextRequest) {
  return userBffRequest(request, '/auth/logout');
}
