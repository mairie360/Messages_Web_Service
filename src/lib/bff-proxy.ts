import { NextRequest } from 'next/server';
import { proxyPublishedBffRequest } from '@mairie360/lib-components/next';
import contract from '../../contracts/openapi.json';

type RouteContext = { params: Promise<{ path: string[] }> };

function cookieAuthorizedRequest(request: NextRequest) {
  request.headers.delete('authorization');
  return request;
}

export function configuredBffUrl() {
  const value = (process.env.BFF_MESSAGE_BASE_URL ??
    process.env.MESSAGE_BFF_URL ??
    process.env.NEXT_PUBLIC_BFF_MESSAGE_BASE_URL)?.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return '';
    return value.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export async function forwardToBff(request: NextRequest, baseUrl: string, path: string) {
  return proxyPublishedBffRequest(cookieAuthorizedRequest(request), path.split('/').filter(Boolean), {
    baseUrl: () => baseUrl,
    paths: contract.paths,
    loginUrl: () => process.env.LOGIN_FRONT_URL?.trim() ?? '',
    frontUrl: () => process.env.MESSAGE_FRONT_URL?.trim() ?? '',
  });
}

export async function proxyBffRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyPublishedBffRequest(cookieAuthorizedRequest(request), path, {
    baseUrl: configuredBffUrl,
    paths: contract.paths,
    loginUrl: () => process.env.LOGIN_FRONT_URL?.trim() ?? '',
    frontUrl: () => process.env.MESSAGE_FRONT_URL?.trim() ?? '',
  });
}
