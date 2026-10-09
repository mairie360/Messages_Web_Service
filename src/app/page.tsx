'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Messaging } from "@mairie360/lib-components";
import { BffNavigationRequiredError, BffRequestError, messageClient, type CurrentUserDto, type MessageId } from "@/clients/messageClient";
import {
  appendMessage,
  getPayloadIds,
  idsMatch,
  replaceConversationMessages,
  toMessagingContacts,
  toMessagingUserId,
  upsertConversation,
  type MessagingBusinessReference,
  type MessagingContactId,
  type MessagingConversation,
  type MessagingMessage,
} from "@/lib/messaging-state";
import { AppShell } from "./_components/app-shell";
import { prepareMessagingScrollRegions } from "./_components/messaging-scroll-regions";
import { presentConversationTimestamps, presentMessageTimestamps } from "@/lib/message-timestamps";
import { buildMessageMentionOptions, presentMessageAuthors } from "@/lib/message-authors";
import { logoutAndReload } from "@/lib/auth-session";

type MessagingProps = ComponentProps<typeof Messaging>;
type SendMessagePayload = Parameters<NonNullable<MessagingProps["onSendMessage"]>>[0];
type DraftAttachment = Parameters<NonNullable<MessagingProps["onAttach"]>>[1][number];
type NewMessagePayload = Parameters<NonNullable<MessagingProps["onNewMessageSend"]>>[0];
type CreateGroupPayload = Parameters<NonNullable<MessagingProps["onCreateGroup"]>>[0];

// Match the reference reception cadence; the refresh effect skips hidden pages,
// pending reads and mutations rather than queueing overlapping requests.
const MESSAGE_REFRESH_INTERVAL_MS = 2_000;
const pageIsVisible = () => typeof document === "undefined" || !document.hidden;
const requiresPageNavigation = (error: unknown) => error instanceof BffNavigationRequiredError ||
  (error instanceof BffRequestError && error.status === 401);
const hasServerId = (id: unknown): id is MessageId =>
  (typeof id === "string" && id.trim().length > 0) ||
  (typeof id === "number" && Number.isFinite(id));

function MobileConversationSwitch({
  showConversationList,
  onToggle,
}: {
  showConversationList: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="messages-pane-switch"
      aria-pressed={showConversationList}
      onClick={onToggle}
    >
      {showConversationList ? "Retour à la conversation" : "Voir les conversations"}
    </button>
  );
}

export default function Page() {
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);
  const [activeConversationId, setActiveConversationId] =
    useState<MessagingContactId>("");
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [contacts, setContacts] = useState<MessagingConversation[]>([]);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [confirmedConversationIds, setConfirmedConversationIds] = useState(() => new Set<string>());
  const [pendingSelection, setPendingSelection] = useState<MessagingContactId | null>(null);
  const [businessReferences, setBusinessReferences] =
    useState<MessagingBusinessReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const activeConversationRef = useRef<MessagingContactId>("");
  const revisionRef = useRef(0);
  const mutationCountRef = useRef(0);
  const selectionLoadingRef = useRef<number | null>(null);
  const navigationStartedRef = useRef(false);
  const deletionPendingRef = useRef(false);
  const bootstrapLifecycleRef = useRef({ mounted: false, generation: 0, pending: false });
  const readPendingRef = useRef<symbol | null>(null);
  const confirmedMessagesRef = useRef(messages);
  useLayoutEffect(() => { confirmedMessagesRef.current = messages; }, [messages]);
  // Draft descriptors contain local object URLs, never BFF attachment IDs.
  // Weak keys allow removed files to be released without an explicit removal callback.
  const attachmentFilesRef = useRef(new WeakMap<DraftAttachment, File>());

  const selectedConversation = conversations.find((conversation) => idsMatch(conversation.id, activeConversationId));
  const hasConfirmedThread = confirmedConversationIds.has(String(activeConversationId));
  const hasConfirmedMessages = messages.some(message => idsMatch(message.conversationId, activeConversationId));
  const selectionPending = pendingSelection !== null && idsMatch(pendingSelection, activeConversationId);
  const selectedName = selectedConversation?.name ?? "la conversation";
  const threadPlaceholder = selectionPending
    ? `Chargement des messages de ${selectedName}…`
    : `Les messages de ${selectedName} sont indisponibles. Sélectionnez ce fil pour réessayer.`;

  const confirmThread = useCallback((id: MessagingContactId) => {
    setConfirmedConversationIds((current) => current.has(String(id)) ? current : new Set([...current, String(id)]));
  }, []);

  // Keep BFF state intact; only the shared component receives display labels.
  const displayedConversations = useMemo(() => presentConversationTimestamps(conversations), [conversations]);
  const mentionOptions = useMemo(() => buildMessageMentionOptions(contacts, conversations), [contacts, conversations]);
  const displayedMessages = useMemo(
    () => presentMessageAuthors(presentMessageTimestamps(messages), toMessagingUserId(currentUser?.id), mentionOptions, businessReferences),
    [messages, currentUser?.id, mentionOptions, businessReferences],
  );

  const recoverSessionNavigation = useCallback(async (failure: unknown) => {
    if (!requiresPageNavigation(failure)) return false;
    if (navigationStartedRef.current) return true;
    navigationStartedRef.current = true;
    if (failure instanceof BffRequestError) {
      // Clear a rejected cookie through the existing local session flow.
      // Its finally block reloads even if the cleanup transport fails.
      await logoutAndReload().catch(() => undefined);
    } else {
      // Opaque redirects expose no trustworthy destination. The protected page
      // and unchanged middleware own Login navigation and its return path.
      window.location.reload();
    }
    return true;
  }, []);

  const loadBootstrap = useCallback(async () => {
    const lifecycle = bootstrapLifecycleRef.current;
    // The ref guards repeated commands before React can render the disabled button.
    if (!lifecycle.mounted || lifecycle.pending) return;
    lifecycle.pending = true;
    const generation = ++lifecycle.generation;
    const isCurrent = () => lifecycle.mounted && lifecycle.generation === generation;
    try {
      const bootstrap = await messageClient.getBootstrap();

      if (!isCurrent()) return;

      const firstConversationId = bootstrap.conversations[0]?.id ?? "";
      const requestedConversationId = new URLSearchParams(window.location.search).get("conversation")?.trim();
      let selectedId = bootstrap.activeConversationId ?? firstConversationId;
      let initialConversations: MessagingConversation[] = bootstrap.conversations;
      let initialMessages: MessagingMessage[] = bootstrap.messages;

      if (requestedConversationId) {
        try {
          // The BFF decides whether this user may access the requested thread.
          const thread = await messageClient.getConversationMessages(requestedConversationId);
          if (!isCurrent()) return;
          if (!idsMatch(thread.conversation.id, requestedConversationId)) {
            throw new Error("La conversation demandée est indisponible.");
          }
          selectedId = thread.conversation.id;
          initialConversations = upsertConversation(initialConversations, thread.conversation);
          initialMessages = replaceConversationMessages(initialMessages, selectedId, thread.messages);
        } catch (threadError) {
          if (!isCurrent()) return;
          // Opening a deep link is a thread selection too. Do not mount an
          // unrelated fallback before the existing session guard can recover.
          if (pageIsVisible() && requiresPageNavigation(threadError) &&
              await recoverSessionNavigation(threadError)) return;
          setError("La conversation demandée est introuvable ou inaccessible.");
        }
      }

      setCurrentUser(bootstrap.currentUser);
      setContacts(toMessagingContacts(bootstrap.contacts));
      setConversations(initialConversations);
      setMessages(initialMessages);
      setConfirmedConversationIds(new Set([
        ...(selectedId === "" ? [] : [String(selectedId)]),
        ...initialMessages.flatMap((message) => message.conversationId === undefined ? [] : [String(message.conversationId)]),
      ]));
      activeConversationRef.current = selectedId;
      setActiveConversationId(selectedId);
      setShowConversationList(selectedId === "");

      // Load contacts independently so the recipient menu does not depend
      // on the modal opening timing or on the conversation list.
      try {
        const contactsResponse = await messageClient.getContacts();
        if (isCurrent()) {
          setContacts(toMessagingContacts(contactsResponse.contacts));
        }
      } catch {
        // Bootstrap contacts remain available as a fallback.
      }
    } catch (loadError) {
      if (!isCurrent()) return;
      setBootstrapError(
        loadError instanceof Error
          ? loadError.message
          : "La messagerie est indisponible.",
      );
    } finally {
      if (isCurrent()) {
        lifecycle.pending = false;
        setLoading(false);
      }
    }
  }, [recoverSessionNavigation]);

  const retryBootstrap = () => {
    const lifecycle = bootstrapLifecycleRef.current;
    if (!lifecycle.mounted || lifecycle.pending) return;
    setLoading(true);
    setBootstrapError(null);
    setError(null);
    void loadBootstrap();
  };

  useEffect(() => {
    const lifecycle = bootstrapLifecycleRef.current;
    lifecycle.mounted = true;
    void loadBootstrap();

    return () => {
      // The existing client has no AbortSignal parameter. Ignore disposed responses
      // rather than claiming transport cancellation or changing the client contract.
      lifecycle.mounted = false;
      lifecycle.generation += 1;
      lifecycle.pending = false;
      selectionLoadingRef.current = null;
    };
  }, [loadBootstrap]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    async function loadBusinessReferences() {
      if (disposed || inFlight || !pageIsVisible()) return;
      inFlight = true;
      try {
        const response = await messageClient.getBusinessReferences();

        if (!disposed) setBusinessReferences(response.references ?? []);
      } catch (loadError) {
        // Keep suggestions through transient failures, but not an explicit access refusal.
        if (!disposed && loadError instanceof BffRequestError &&
            (loadError.status === 401 || loadError.status === 403)) {
          setBusinessReferences([]);
        }
      } finally {
        inFlight = false;
      }
    }

    const refreshReferences = () => { void loadBusinessReferences(); };
    refreshReferences();
    window.addEventListener("focus", refreshReferences);
    document.addEventListener("visibilitychange", refreshReferences);

    return () => {
      disposed = true;
      window.removeEventListener("focus", refreshReferences);
      document.removeEventListener("visibilitychange", refreshReferences);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let disposed = false;
    let inFlight = false;

    const refresh = async () => {
      if (disposed || navigationStartedRef.current || inFlight || !pageIsVisible() || mutationCountRef.current > 0 ||
          selectionLoadingRef.current !== null) return;
      inFlight = true;
      const revision = revisionRef.current;
      const selectedId = activeConversationRef.current;
      try {
        const list = await messageClient.getConversations();
        const selectedExists = selectedId !== "" && list.conversations.some((conversation: MessagingConversation) =>
          idsMatch(conversation.id, selectedId),
        );
        const nextId = selectedExists ? selectedId : list.conversations[0]?.id ?? "";
        let thread: Awaited<ReturnType<typeof messageClient.getConversationMessages>> | null = null;
        let fallbackReadFailed = false;
        if (nextId !== "") {
          try {
            thread = await messageClient.getConversationMessages(nextId);
            if (!idsMatch(thread.conversation.id, nextId)) {
              throw new Error("Les messages reçus ne correspondent pas à la conversation sélectionnée.");
            }
          } catch (readError) {
            // Session/navigation failures must also escape a replacement-thread
            // read; treating them as a transient fallback hides the auth gate.
            if (requiresPageNavigation(readError)) throw readError;
            // A failed read of a still-existing thread preserves the previous view.
            // A confirmed disappearance must not resurrect it when its replacement fails.
            if (selectedExists) throw readError;
            thread = null;
            fallbackReadFailed = true;
          }
        }
        if (disposed || !pageIsVisible() || revisionRef.current !== revision ||
            mutationCountRef.current > 0 || selectionLoadingRef.current !== null ||
            !idsMatch(activeConversationRef.current, selectedId)) return;

        setConversations(list.conversations);
        if (thread) {
          confirmThread(nextId);
          setMessages((current) =>
            replaceConversationMessages(current, nextId, thread.messages),
          );
        }
        if (!idsMatch(nextId, selectedId)) {
          activeConversationRef.current = nextId;
          revisionRef.current += 1;
          setActiveConversationId(nextId);
          setMessages((current) => current.filter((message) =>
            !idsMatch(message.conversationId, selectedId),
          ));
          if (nextId === "") setShowConversationList(true);
        }
        if (!disposed) setSyncError(fallbackReadFailed
          ? "Les messages de la conversation sélectionnée sont momentanément indisponibles. Sélectionnez-la de nouveau pour réessayer."
          : null);
      } catch (refreshError) {
        if (!disposed && revisionRef.current === revision && pageIsVisible()) {
          if (requiresPageNavigation(refreshError) && await recoverSessionNavigation(refreshError)) return;
          setSyncError("La synchronisation des conversations est momentanément indisponible.");
        }
      } finally {
        inFlight = false;
      }
    };

    const triggerRefresh = () => { void refresh(); };
    triggerRefresh();
    const timer = window.setInterval(triggerRefresh, MESSAGE_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", triggerRefresh);
    document.addEventListener("visibilitychange", triggerRefresh);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", triggerRefresh);
      document.removeEventListener("visibilitychange", triggerRefresh);
    };
  }, [currentUser, recoverSessionNavigation, confirmThread]);

  const beginMutation = () => {
    revisionRef.current += 1;
    mutationCountRef.current += 1;
    selectionLoadingRef.current = null;
    setPendingSelection(null);
  };

  const endMutation = (preserveSelection = false) => {
    mutationCountRef.current -= 1;
    revisionRef.current += 1;
    if (!preserveSelection) selectionLoadingRef.current = null;
  };

  const loadContacts = async () => {
    try {
      const response = await messageClient.getContacts();
      setContacts(toMessagingContacts(response.contacts));
    } catch (contactsError) {
      setError(
        contactsError instanceof Error
          ? contactsError.message
          : "Les contacts sont indisponibles.",
      );
    }
  };

  const loadConversationMessages = async (conversationId: MessagingContactId) => {
    if (navigationStartedRef.current || !bootstrapLifecycleRef.current.mounted) return;
    const revision = ++revisionRef.current;
    activeConversationRef.current = conversationId;
    selectionLoadingRef.current = revision;
    setPendingSelection(conversationId);
    setActiveConversationId(conversationId);
    setError(null);
    const isCurrent = () => bootstrapLifecycleRef.current.mounted &&
      selectionLoadingRef.current === revision &&
      idsMatch(activeConversationRef.current, conversationId);

    try {
      const response = await messageClient.getConversationMessages(conversationId);
      if (!isCurrent()) return;
      if (!idsMatch(response.conversation.id, conversationId)) {
        throw new Error("Les messages reçus ne correspondent pas à la conversation sélectionnée. Réessayez.");
      }

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      confirmThread(response.conversation.id);
      setMessages((currentMessages) =>
        replaceConversationMessages(
          currentMessages,
          response.conversation.id,
          response.messages,
        ),
      );
      setShowConversationList(false);
      setSyncError(null);
    } catch (loadError) {
      if (!isCurrent()) return;
      if (pageIsVisible() && requiresPageNavigation(loadError) &&
          await recoverSessionNavigation(loadError)) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Les messages de cette conversation sont indisponibles.",
      );
    } finally {
      if (selectionLoadingRef.current === revision) {
        selectionLoadingRef.current = null;
        setPendingSelection(null);
      }
    }
  };

  const handleSendMessage = async (payload: SendMessagePayload) => {
    // A captured callback must not send to the previous or unconfirmed thread,
    // even before React renders the disabled composer. Known current histories
    // remain usable while a refresh is pending; mutation invalidates that read.
    if (!idsMatch(activeConversationRef.current, payload.conversationId) ||
        !confirmedConversationIds.has(String(payload.conversationId))) return false;
    const draftAttachments = payload.attachments ?? [];
    if (!payload.conversationId || (payload.content.trim().length === 0 && draftAttachments.length === 0)) {
      return false;
    }

    setError(null);
    beginMutation();

    try {
      let attachmentIds: MessageId[] = [];
      if (draftAttachments.length > 0) {
        const files: File[] = [];
        for (const attachment of draftAttachments) {
          const file = attachmentFilesRef.current.get(attachment);
          if (!file) {
            throw new Error("La pièce jointe sélectionnée est indisponible. Ajoutez-la de nouveau.");
          }
          files.push(file);
        }
        const uploaded = await messageClient.uploadAttachments(files);
        if (!Array.isArray(uploaded?.attachments) || uploaded.attachments.length !== draftAttachments.length) {
          throw new Error("Le transfert des pièces jointes n’a pas été confirmé. Aucun message n’a été envoyé.");
        }
        attachmentIds = uploaded.attachments.map((attachment: { id: unknown }) => {
          if (!hasServerId(attachment?.id)) {
            throw new Error("Le transfert des pièces jointes n’a pas été confirmé. Aucun message n’a été envoyé.");
          }
          return attachment.id;
        });
      }
      const response = await messageClient.sendMessage(payload.conversationId, {
        content: payload.content,
        attachmentIds,
        mentionIds: getPayloadIds(payload.mentions),
      });

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );

      setMessages((currentMessages) =>
        appendMessage(currentMessages, response.message),
      );
      draftAttachments.forEach((attachment) => {
        if (attachment.url?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL?.(attachment.url);
          } catch {
            // A local preview cleanup failure must not turn a confirmed send into a retry.
          }
        }
      });
      return true;
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Le message n'a pas pu être envoyé.",
      );
      return false;
    } finally {
      endMutation();
    }
  };

  const handleReadVisibleMessages: NonNullable<MessagingProps["onReadVisibleMessages"]> =
    async (conversation, lastVisibleMessage) => {
      const lifecycle = bootstrapLifecycleRef.current;
      if (!lifecycle.mounted || navigationStartedRef.current || !pageIsVisible() ||
          readPendingRef.current || mutationCountRef.current > 0 || selectionLoadingRef.current !== null ||
          !idsMatch(activeConversationRef.current, conversation.id) ||
          !confirmedConversationIds.has(String(conversation.id))) return;
      if (!lastVisibleMessage || !hasServerId(lastVisibleMessage.id) ||
          !idsMatch(lastVisibleMessage.conversationId, conversation.id) ||
          !confirmedMessagesRef.current.some(message => idsMatch(message.id, lastVisibleMessage.id) &&
            idsMatch(message.conversationId, conversation.id))) return;

      const request = Symbol("visible-message-read");
      const generation = lifecycle.generation;
      readPendingRef.current = request;
      setError(null);
      beginMutation();
      const revision = revisionRef.current;
      const isCurrent = () => lifecycle.mounted && lifecycle.generation === generation &&
        readPendingRef.current === request && !navigationStartedRef.current && pageIsVisible() &&
        revisionRef.current === revision && idsMatch(activeConversationRef.current, conversation.id);
      try {
        await messageClient.acknowledgeVisibleMessages(conversation.id, lastVisibleMessage.id);
        if (!isCurrent()) return;
        // A successful read reply is not a complete current snapshot: new messages
        // may have arrived, and the old stable BFF returned a fabricated zero.
        // Only an authoritative fresh GET can change a displayed counter.
        const fresh = await messageClient.getConversations();
        if (!isCurrent()) return;
        const target = fresh?.conversations?.find(item => idsMatch(item.id, conversation.id));
        if (!Array.isArray(fresh?.conversations) || !target ||
            !Number.isSafeInteger(target.unreadCount) || (target.unreadCount ?? -1) < 0) {
          throw new Error("Le compteur des messages n’a pas pu être confirmé.");
        }
        setConversations(current => current.map(item => {
          const next = fresh.conversations.find(candidate => idsMatch(candidate.id, item.id));
          return next && Number.isSafeInteger(next.unreadCount) && (next.unreadCount ?? -1) >= 0
            ? { ...item, unreadCount: next.unreadCount }
            : item;
        }));
      } catch (failure) {
        if (!isCurrent()) return;
        if (await recoverSessionNavigation(failure)) return;
        if (isCurrent()) setError("Les messages affichés n’ont pas pu être marqués comme lus. Le fil et les compteurs sont conservés ; réessayez.");
      } finally {
        if (readPendingRef.current === request) {
          readPendingRef.current = null;
          endMutation(true);
        }
      }
    };

  const handleNewMessageSend = async (payload: NewMessagePayload) => {
    if (payload.message.trim().length === 0) {
      return false;
    }

    setError(null);
    beginMutation();

    try {
      const response = await messageClient.createDirectMessage(payload);

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setMessages((currentMessages) =>
        appendMessage(currentMessages, response.message),
      );
      setActiveConversationId(response.conversation.id);
      confirmThread(response.conversation.id);
      activeConversationRef.current = response.conversation.id;
      setShowConversationList(false);
      return true;
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Le message direct n'a pas pu être créé.",
      );
      return false;
    } finally {
      endMutation();
    }
  };

  const handleCreateGroup = async (payload: CreateGroupPayload) => {
    setError(null);
    beginMutation();

    try {
      const response = await messageClient.createGroup(payload);

      setConversations((currentConversations) =>
        upsertConversation(currentConversations, response.conversation),
      );
      setActiveConversationId(response.conversation.id);
      confirmThread(response.conversation.id);
      activeConversationRef.current = response.conversation.id;
      setShowConversationList(false);
      return true;
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Le groupe n'a pas pu être créé.",
      );
      return false;
    } finally {
      endMutation();
    }
  };

  const handleConversationDelete: NonNullable<MessagingProps["onConversationDelete"]> =
    async (conversationToDelete) => {
      // An immediate guard also covers repeated callbacks before React renders.
      if (deletionPendingRef.current) return;
      deletionPendingRef.current = true;
      setDeletingConversation(true);
      setError(null);
      beginMutation();

      try {
        const response = await messageClient.deleteConversation(conversationToDelete.id);
        // The published contract requires deleted:true; an optional ID must
        // refer to the requested thread before any known local data is removed.
        if (response?.deleted !== true ||
            (response.conversationId !== undefined &&
             !idsMatch(response.conversationId, conversationToDelete.id))) {
          throw new Error("La suppression de la conversation n’a pas été confirmée. Réessayez.");
        }

        if (idsMatch(activeConversationRef.current, conversationToDelete.id)) {
          const fallbackId = conversations.find((conversation) =>
            !idsMatch(conversation.id, conversationToDelete.id))?.id ?? "";
          activeConversationRef.current = fallbackId;
          setActiveConversationId(fallbackId);
          if (!fallbackId) setShowConversationList(true);
          else void loadConversationMessages(fallbackId);
        }
        setConversations((currentConversations) => currentConversations.filter(
          (conversation) => !idsMatch(conversation.id, conversationToDelete.id),
        ));
        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) => !idsMatch(message.conversationId, conversationToDelete.id),
          ),
        );
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "La conversation n'a pas pu être supprimée.",
        );
      } finally {
        deletionPendingRef.current = false;
        setDeletingConversation(false);
        // An unrelated thread selected after deletion started may still be
        // loading; do not discard that response when this delete completes.
        endMutation(!idsMatch(activeConversationRef.current, conversationToDelete.id));
      }
    };

  return (
    <AppShell activeItem="messages">
      <div className="messages-module-stack">
        {loading || !currentUser ? (
          <section
            aria-labelledby="messages-bootstrap-title"
            aria-busy={loading}
            className="min-h-0 overflow-y-auto rounded-lg bg-white p-6 shadow-sm"
          >
            <h1 id="messages-bootstrap-title" className="text-xl font-semibold">
              {loading ? "Chargement de la messagerie" : "Messagerie indisponible"}
            </h1>
            {bootstrapError ? (
              <p role="alert" className="messages-error">{bootstrapError}</p>
            ) : null}
            <p role="status" className="my-4">
              {loading
                ? "Les conversations sont en cours de chargement."
                : "Les conversations n’ont pas pu être chargées. Vous pouvez réessayer."}
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={retryBootstrap}
              className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Chargement en cours…" : "Réessayer"}
            </button>
          </section>
        ) : (
          <>
            {deletingConversation && (
              <p role="status" className="messages-operation-status">
                Suppression de la conversation en cours…
              </p>
            )}
            {error && (
              <p role="alert" className="messages-error">
                {error}
              </p>
            )}
            {syncError && (
              <p role="alert" className="messages-error">
                {syncError}
              </p>
            )}
            {selectionPending && (
              <p role="status" className="messages-operation-status">{threadPlaceholder}</p>
            )}

            {activeConversationId && (
              <MobileConversationSwitch
                showConversationList={showConversationList}
                onToggle={() => setShowConversationList((current) => !current)}
              />
            )}
            <div
              className={`messages-module-frame${showConversationList ? " messages-list-open" : ""}`}
              ref={prepareMessagingScrollRegions}
            >
              <Messaging
                conversations={displayedConversations}
                contacts={contacts}
                messages={displayedMessages}
                mentionOptions={mentionOptions}
                businessReferences={businessReferences}
                activeConversationId={hasConfirmedThread ? activeConversationId : ""}
                currentUserId={toMessagingUserId(currentUser?.id)}
                emptyStateLabel={activeConversationId === "" || hasConfirmedThread ? "Aucune conversation" : threadPlaceholder}
                aria-busy={selectionPending}
                onConversationSelect={(conversation) =>
                  void loadConversationMessages(conversation.id)
                }
                onNewMessageClick={() => void loadContacts()}
                onCreateGroupClick={() => void loadContacts()}
                onSendMessage={hasConfirmedThread ? handleSendMessage : undefined}
                onReadVisibleMessages={hasConfirmedThread && hasConfirmedMessages && !selectionPending ? handleReadVisibleMessages : undefined}
                onAttach={(files, attachments) => {
                  attachments.forEach((attachment, index) => {
                    if (files[index]) attachmentFilesRef.current.set(attachment, files[index]);
                  });
                }}
                onNewMessageSend={handleNewMessageSend}
                onCreateGroup={handleCreateGroup}
                onConversationDelete={deletingConversation || !hasConfirmedThread ? undefined : handleConversationDelete}
                className="messages-module"
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
