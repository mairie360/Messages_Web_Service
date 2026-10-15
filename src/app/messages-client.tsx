'use client';

import { MessagesWorkspace } from "./_components/messages-workspace";
import { useMessagingController } from "./_components/use-messaging-controller";

import type { InitialMessagingPage } from '@/lib/messaging-bootstrap-receipt';

export default function MessagesClient({ initial }: { initial?: InitialMessagingPage }) {
  const controller = useMessagingController({ initial });
  return <MessagesWorkspace {...controller} />;
}
