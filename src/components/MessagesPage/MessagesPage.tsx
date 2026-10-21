'use client';

import { MessagesWorkspace } from './components/MessagesWorkspace';
import { useMessagingController } from './use-messaging-controller';

import type { InitialMessagingPage } from '../../lib/messaging-bootstrap-receipt';

export default function MessagesClient({ initial }: { initial?: InitialMessagingPage }) {
  const controller = useMessagingController({ initial });
  return <MessagesWorkspace {...controller} />;
}
