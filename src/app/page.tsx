'use client';

import { MessagesWorkspace } from "./_components/messages-workspace";
import { useMessagingController } from "./_components/use-messaging-controller";

export default function Page() {
  const controller = useMessagingController();
  return <MessagesWorkspace {...controller} />;
}
