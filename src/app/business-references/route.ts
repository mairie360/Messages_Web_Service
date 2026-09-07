import { NextRequest } from 'next/server';
import { configuredBffUrl, forwardToBff } from '@/lib/bff-proxy';

export function GET(request: NextRequest) {
  return forwardToBff(request, configuredBffUrl(), '/business-references');
}
