'use client';

import { useState } from "react";
import type { ComponentProps } from "react";
import { Footer, Header, Messaging, Sidebar } from "@mairie360/lib-components";

type MessagingProps = ComponentProps<typeof Messaging>;
type MessagingConversation = NonNullable<MessagingProps["conversations"]>[number];
type MessagingMessage = NonNullable<MessagingProps["messages"]>[number];
type MessagingContactId = MessagingConversation["id"];
type SendMessagePayload = Parameters<NonNullable<MessagingProps["onSendMessage"]>>[0];
type NewMessagePayload = Parameters<NonNullable<MessagingProps["onNewMessageSend"]>>[0];
type CreateGroupPayload = Parameters<NonNullable<MessagingProps["onCreateGroup"]>>[0];

const currentUserId = "admin-systeme";

const initialConversations: MessagingConversation[] = [
  {
    id: "marie-dubois",
    name: "Marie Dubois",
    department: "Finances",
    initials: "MD",
    presence: "online",
    lastMessage: "Le budget a été validé pour le projet",
    lastMessageAt: "14:32",
    unreadCount: 2,
  },
  {
    id: "pierre-martin",
    name: "Pierre Martin",
    department: "Urbanisme",
    initials: "PM",
    presence: "offline",
    lastMessage: "Pouvez-vous envoyer le rapport ?",
    lastMessageAt: "13:45",
  },
  {
    id: "sophie-leroy",
    name: "Sophie Leroy",
    department: "Culture",
    initials: "SL",
    presence: "online",
    lastMessage: "Réunion reportée à demain",
    lastMessageAt: "12:18",
    unreadCount: 1,
  },
  {
    id: "thomas-bernard",
    name: "Thomas Bernard",
    department: "Travaux",
    initials: "TB",
    presence: "offline",
    lastMessage: "Documents envoyés",
    lastMessageAt: "11:30",
  },
  {
    id: "equipe-direction",
    name: "Équipe Direction",
    department: "Groupe",
    kind: "group",
    initials: "ÉD",
    presence: "online",
    lastMessage: "Nouvelle procédure disponible",
    lastMessageAt: "Hier",
    unreadCount: 3,
  },
];

const initialMessages: MessagingMessage[] = [
  {
    id: "message-1",
    conversationId: "marie-dubois",
    content: "Bonjour Jean, j’ai examiné le dossier du projet de rénovation.",
    sentAt: "14:25",
    direction: "incoming",
    authorId: "marie-dubois",
    authorName: "Marie Dubois",
  },
  {
    id: "message-2",
    conversationId: "marie-dubois",
    content: "Parfait, quelles sont vos conclusions ?",
    sentAt: "14:27",
    direction: "outgoing",
    authorId: currentUserId,
    authorName: "Admin Système",
  },
  {
    id: "message-3",
    conversationId: "marie-dubois",
    content: "Le budget a été validé pour le projet. Nous pouvons commencer la phase suivante.",
    sentAt: "14:32",
    direction: "incoming",
    authorId: "marie-dubois",
    authorName: "Marie Dubois",
  },
  {
    id: "message-4",
    conversationId: "pierre-martin",
    content: "Bonjour, pouvez-vous envoyer le rapport d’urbanisme ?",
    sentAt: "13:45",
    direction: "incoming",
    authorId: "pierre-martin",
    authorName: "Pierre Martin",
  },
  {
    id: "message-5",
    conversationId: "sophie-leroy",
    content: "La réunion culture est reportée à demain matin.",
    sentAt: "12:18",
    direction: "incoming",
    authorId: "sophie-leroy",
    authorName: "Sophie Leroy",
  },
  {
    id: "message-6",
    conversationId: "thomas-bernard",
    content: "Les documents techniques ont bien été envoyés.",
    sentAt: "11:30",
    direction: "incoming",
    authorId: "thomas-bernard",
    authorName: "Thomas Bernard",
  },
  {
    id: "message-7",
    conversationId: "equipe-direction",
    content: "Une nouvelle procédure est disponible pour validation.",
    sentAt: "Hier",
    direction: "incoming",
    authorId: "equipe-direction",
    authorName: "Équipe Direction",
  },
];

const adminUser = {
  name: "Admin Système",
  email: "admin@mairie360.fr",
  role: "admin",
};

const formatMessageTime = () =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] =
    useState<MessagingContactId>("marie-dubois");
  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState(initialMessages);

  const updateConversationPreview = (
    conversationId: MessagingContactId,
    content: SendMessagePayload["content"],
    sentAt: string,
  ) => {
    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              lastMessage: content,
              lastMessageAt: sentAt,
              unreadCount: 0,
            }
          : conversation,
      ),
    );
  };

  const handleSendMessage = (payload: SendMessagePayload) => {
    if (!payload.conversationId || payload.content.trim().length === 0) {
      return;
    }

    const sentAt = formatMessageTime();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `local-message-${Date.now()}`,
        conversationId: payload.conversationId,
        content: payload.content,
        attachments: payload.attachments,
        mentions: payload.mentions,
        sentAt,
        direction: "outgoing",
        authorId: currentUserId,
        authorName: adminUser.name,
      },
    ]);
    updateConversationPreview(payload.conversationId, payload.content, sentAt);
  };

  const handleNewMessageSend = (payload: NewMessagePayload) => {
    const sentAt = formatMessageTime();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `direct-message-${Date.now()}`,
        conversationId: payload.recipientId,
        content: payload.message,
        sentAt,
        direction: "outgoing",
        authorId: currentUserId,
        authorName: adminUser.name,
      },
    ]);
    updateConversationPreview(payload.recipientId, payload.message, sentAt);
    setActiveConversationId(payload.recipientId);
  };

  const handleCreateGroup = (payload: CreateGroupPayload) => {
    const sentAt = formatMessageTime();
    const groupId = `groupe-${Date.now()}`;
    const group: MessagingConversation = {
      id: groupId,
      name: payload.name,
      department: "Groupe",
      kind: "group",
      initials: getInitials(payload.name),
      presence: "online",
      lastMessage: payload.description || `${payload.memberIds.length} membres`,
      lastMessageAt: sentAt,
    };

    setConversations((currentConversations) => [group, ...currentConversations]);
    setActiveConversationId(groupId);
  };

  const handleConversationDelete: NonNullable<MessagingProps["onConversationDelete"]> = (
    conversationToDelete,
  ) => {
    const remainingConversations = conversations.filter(
      (conversation) => conversation.id !== conversationToDelete.id,
    );

    setConversations(remainingConversations);
    setMessages((currentMessages) =>
      currentMessages.filter(
        (message) => message.conversationId !== conversationToDelete.id,
      ),
    );

    if (activeConversationId === conversationToDelete.id) {
      setActiveConversationId(remainingConversations[0]?.id ?? "");
    }
  };

  return (
    <div className="messages-app-root">
      <div className="messages-shell">
        <div className="messages-desktop-sidebar">
          <Sidebar activeItem="messages" brandLogoSrc={null} isAdmin />
        </div>

        {sidebarOpen && (
          <div className="messages-mobile-sidebar">
            <button
              type="button"
              aria-label="Fermer la navigation"
              className="messages-mobile-sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
            />
            <Sidebar
              activeItem="messages"
              brandLogoSrc={null}
              isAdmin
              className="messages-mobile-sidebar-panel"
              onItemSelect={() => setSidebarOpen(false)}
            />
          </div>
        )}

        <div className="messages-content">
          <Header user={adminUser} isAdmin setSidebarOpen={setSidebarOpen} />

          <main className="messages-main">
            <div className="messages-main-inner">
              <Messaging
                conversations={conversations}
                messages={messages}
                activeConversationId={activeConversationId}
                currentUserId={currentUserId}
                onConversationSelect={(conversation) =>
                  setActiveConversationId(conversation.id)
                }
                onSendMessage={handleSendMessage}
                onNewMessageSend={handleNewMessageSend}
                onCreateGroup={handleCreateGroup}
                onConversationDelete={handleConversationDelete}
                className="messages-module"
                style={{
                  height: "min(692px, calc(100vh - 192px))",
                  minHeight: "560px",
                }}
              />
            </div>
          </main>

          <Footer productName="Mairie360" year={2026} version="2.1.0" />
        </div>
      </div>
    </div>
  );
}
