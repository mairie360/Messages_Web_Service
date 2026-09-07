import { NextRequest } from 'next/server';
import { forwardToBff } from './bff-proxy';

export function userBffRequest(request: NextRequest, path: string) {
  const baseUrl = process.env.USER_BFF_URL ?? process.env.BFF_USER_API_URL ?? 'http://localhost:4000';
  return forwardToBff(request, baseUrl, path);
}
