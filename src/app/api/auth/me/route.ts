import { NextRequest } from 'next/server';
import { userBffRequest } from '@/lib/user-bff-proxy';

export function GET(request: NextRequest) {
  return userBffRequest(request, '/me');
}
