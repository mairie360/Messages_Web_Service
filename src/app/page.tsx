import React from 'react';
import { cookies } from 'next/headers';
import { createNonce } from '@mairie360/lib-components/shared';
import { loadInitialMessagingPage } from '@/lib/server-messaging-page';
import { serverMessagingSelection } from '@/lib/messaging-page-query';
import MessagesClient from './messages-client';
export const dynamic = 'force-dynamic';
export default async function MessagesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const initial = await loadInitialMessagingPage((await cookies()).get('accessToken')?.value, serverMessagingSelection(await searchParams ?? {}));
  return <MessagesClient key={createNonce()} initial={initial} />;
}
