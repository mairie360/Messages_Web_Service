'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import type { Messaging } from "@mairie360/lib-components";
import { BffNavigationRequiredError, BffRequestError, messageClient, type CurrentUserDto, type MessageId } from "@/clients/messageClient";
import {
  appendMessage,
  getPayloadIds,
  idsMatch,
  replaceConversationMessages,
  toMentionIds,
  toMessagingContacts,
  toMessagingUserId,
  upsertConversation,
  type MessagingBusinessReference,
  type MessagingContactId,
  type MessagingConversation,
  type MessagingMessage,
} from "@/lib/messaging-state";
import { presentConversationTimestamps, presentMessageTimestamps } from "@/lib/message-timestamps";
import { buildMessageMentionOptions, presentMessageAuthors } from "@/lib/message-authors";
import { isSessionRecoveryPending, navigateToLogin } from "@/lib/logout";
import { receiveMessageStream, type MessageStreamState, type StreamCursor } from '@/lib/message-stream';
import { readPageUrlState } from '@/lib/page-url-state';
import { messagingUrlSchema } from '@/lib/messaging-page-query';
import { readInitialMessagingPage, MESSAGES_INITIAL_UNAVAILABLE, type InitialMessagingPage } from '@/lib/messaging-bootstrap-receipt';
import { usePageUrlState } from '@/lib/use-page-url-state';

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

// Compare only the originating local draft. Never log or persist its contents.
const sendDraftSignature = (payload: SendMessagePayload) => JSON.stringify({
  content: payload.content,
  attachments: (payload.attachments ?? []).map(item => [String(item.id), item.url]),
  mentions: (getPayloadIds(payload.mentions) ?? []).map(String),
  references: (getPayloadIds(payload.businessLinks) ?? []).map(String),
});

import { ATTACHMENTS_UNAVAILABLE_MESSAGE, pendingAttachmentPort, receiveAttachment, uploadDraftAttachments } from "@/lib/attachment-features";
import type { AttachmentFeaturePort } from "@/lib/attachment-features";
import { describeBffError } from "@/lib/bff-error-messages";

export function useMessagingController({ attachmentPort = pendingAttachmentPort, initial }: { attachmentPort?: AttachmentFeaturePort; initial?: InitialMessagingPage } = {}) {
  const [initialReceipt] = useState(() => readInitialMessagingPage(initial));
  const initialSelected = initialReceipt?.thread?.conversation.id ?? initialReceipt?.data.activeConversationId ?? initialReceipt?.data.conversations[0]?.id ?? '';
  const initialConversations = initialReceipt?.thread ? upsertConversation(initialReceipt.data.conversations, initialReceipt.thread.conversation) : initialReceipt?.data.conversations ?? [];
  const initialMessages = initialReceipt?.thread ? replaceConversationMessages(initialReceipt.data.messages, initialSelected, initialReceipt.thread.messages) : initialReceipt?.data.messages ?? [];
  const pageUrl = usePageUrlState(messagingUrlSchema);
  const lastUrlConversation = useRef<string | null>(initialReceipt?.requested ?? null);
  const defaultConversationRef = useRef<MessagingContactId>(initialReceipt?.data.activeConversationId ?? initialReceipt?.data.conversations[0]?.id ?? '');
  const selectionReadRef = useRef<AbortController | null>(null);
  const [streamState, setStreamState] = useState<MessageStreamState>('connecting');
  const [streamRetry, setStreamRetry] = useState(0);
  const streamCursorRef = useRef<StreamCursor & { account: unknown }>({ account: null, lastEventId: '', seen: [] });
  const downloadRef = useRef<AbortController | null>(null);
  useEffect(() => () => downloadRef.current?.abort(), []);
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(initialReceipt?.data.currentUser ?? null);
  const [activeConversationId, setActiveConversationId] =
    useState<MessagingContactId>(initialSelected);
  const [conversations, setConversations] = useState<MessagingConversation[]>(initialConversations);
  const [contacts, setContacts] = useState<MessagingConversation[]>(toMessagingContacts(initialReceipt?.data.contacts));
  const [messages, setMessages] = useState<MessagingMessage[]>(initialMessages);
  const [confirmedConversationIds, setConfirmedConversationIds] = useState(() => new Set<string>(initialReceipt ? [...(initialSelected === '' ? [] : [String(initialSelected)]), ...initialMessages.map(message => String(message.conversationId))] : []));
  const [pendingSelection, setPendingSelection] = useState<MessagingContactId | null>(null);
  const [businessReferences, setBusinessReferences] =
    useState<MessagingBusinessReference[]>([]);
  const [loading, setLoading] = useState(!initialReceipt);
  const [bootstrapError, setBootstrapError] = useState<string | null>(initial?.status === 'unavailable' ? initial.message : initial && !initialReceipt ? MESSAGES_INITIAL_UNAVAILABLE : null);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(initialSelected === '');
  const [deletingConversation, setDeletingConversation] = useState(false);
  const activeConversationRef = useRef<MessagingContactId>(initialSelected);
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
  const pendingSendsRef = useRef(new Map<string, symbol>());
  const unconfirmedSendsRef = useRef(new Map<string, { messageId: MessageId | null; draft: string }>());
  const senderIdentity = useMemo(() => ({ id: currentUser?.id }), [currentUser?.id]);
  const senderIdentityRef = useRef(senderIdentity);
  useLayoutEffect(() => {
    senderIdentityRef.current = senderIdentity;
    pendingSendsRef.current.clear();
    unconfirmedSendsRef.current.clear();
    if (streamCursorRef.current.account !== currentUser?.id) streamCursorRef.current = { account: currentUser?.id, lastEventId: '', seen: [] };
  }, [senderIdentity]);

  useEffect(() => { downloadRef.current?.abort(); }, [activeConversationId, currentUser?.id]);

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
    if (isSessionRecoveryPending()) return false;
    if (!requiresPageNavigation(failure)) return false;
    if (navigationStartedRef.current) return true;
    navigationStartedRef.current = true;
    if (failure instanceof BffRequestError) {
      if (!navigateToLogin()) {
        navigationStartedRef.current = false;
        return false;
      }
    } else {
      // An opaque redirect exposes no trustworthy destination; the unchanged middleware owns it.
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
      const requestedConversationId = readPageUrlState(window.location.search, messagingUrlSchema).conversation;
      let selectedId = bootstrap.activeConversationId ?? firstConversationId;
      defaultConversationRef.current = selectedId;
      lastUrlConversation.current = requestedConversationId;
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
    const pendingSends = pendingSendsRef.current;
    const unconfirmedSends = unconfirmedSendsRef.current;
    lifecycle.mounted = true;
    if (!initialReceipt) void loadBootstrap();

    return () => {
      // The existing client has no AbortSignal parameter. Ignore disposed responses
      // rather than claiming transport cancellation or changing the client contract.
      lifecycle.mounted = false;
      lifecycle.generation += 1;
      lifecycle.pending = false;
      selectionLoadingRef.current = null;
      selectionReadRef.current?.abort();
      pendingSends.clear();
      unconfirmedSends.clear();
    };
  }, [loadBootstrap, initialReceipt]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;

    async function loadBusinessReferences() {
      if (disposed || inFlight || !pageIsVisible() || isSessionRecoveryPending()) return;
      inFlight = true;
      try {
        const response = await messageClient.getBusinessReferences();

        if (!disposed && !isSessionRecoveryPending()) setBusinessReferences(response.references ?? []);
      } catch (loadError) {
        // Keep suggestions through transient failures, but not an explicit access refusal.
        if (!disposed && !isSessionRecoveryPending() && loadError instanceof BffRequestError &&
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
    if (!currentUser || loading) return;
    let disposed = false;
    let inFlight = false;
    let streamConnected = false;
    let eventPending = false;
    let eventTimer: number | undefined;
    let bootstrapWaitTimer: number | undefined;
    let streamController: AbortController | undefined;
    let readController: AbortController | undefined;
    const streamingSupported = typeof window.ReadableStream === 'function';

    const refresh = async () => {
      if (disposed || navigationStartedRef.current || inFlight || !pageIsVisible() || isSessionRecoveryPending() || mutationCountRef.current > 0 ||
          selectionLoadingRef.current !== null) return;
      inFlight = true;
      readController = new AbortController();
      const revision = revisionRef.current;
      const selectedId = activeConversationRef.current;
      try {
        const list = await messageClient.getConversations(readController.signal);
        if (isSessionRecoveryPending()) return;
        const selectedExists = selectedId !== "" && list.conversations.some((conversation: MessagingConversation) =>
          idsMatch(conversation.id, selectedId),
        );
        const nextId = selectedExists ? selectedId : list.conversations[0]?.id ?? "";
        let thread: Awaited<ReturnType<typeof messageClient.getConversationMessages>> | null = null;
        let fallbackReadFailed = false;
        if (nextId !== "") {
          try {
            thread = await messageClient.getConversationMessages(nextId, readController.signal);
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
        if (disposed || !pageIsVisible() || isSessionRecoveryPending() || revisionRef.current !== revision ||
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
          lastUrlConversation.current = String(nextId);
          pageUrl.update({ conversation: String(nextId) }, "replace");
          setMessages((current) => current.filter((message) =>
            !idsMatch(message.conversationId, selectedId),
          ));
          if (nextId === "") setShowConversationList(true);
        }
        if (!disposed) setSyncError(fallbackReadFailed
          ? "Les messages de la conversation sélectionnée sont momentanément indisponibles. Sélectionnez-la de nouveau pour réessayer."
          : null);
      } catch (refreshError) {
        if (!disposed && revisionRef.current === revision && pageIsVisible() && !isSessionRecoveryPending()) {
          if (requiresPageNavigation(refreshError) && await recoverSessionNavigation(refreshError)) return;
          setSyncError("La synchronisation des conversations est momentanément indisponible.");
        }
      } finally {
        inFlight = false;
      }
    };

    const triggerRefresh = () => { if (!streamConnected) void refresh(); };
    const flushEvents = () => {
      eventTimer = undefined;
      if (disposed || navigationStartedRef.current || !pageIsVisible() || !eventPending) return;
      if (inFlight || mutationCountRef.current > 0 || selectionLoadingRef.current !== null || isSessionRecoveryPending()) {
        eventTimer = window.setTimeout(flushEvents, 150);
        return;
      }
      eventPending = false;
      void refresh().finally(() => { if (eventPending && !disposed) eventTimer = window.setTimeout(flushEvents, 100); }).catch(() => undefined);
    };
    const receiveEvent = () => { eventPending = true; if (eventTimer === undefined) eventTimer = window.setTimeout(flushEvents, 100); };
    const startStream = () => {
      if (disposed || navigationStartedRef.current || !streamingSupported || !pageIsVisible()) { if (!disposed) setStreamState('polling'); return; }
      if (bootstrapLifecycleRef.current.pending) { bootstrapWaitTimer = window.setTimeout(startStream, 100); return; }
      streamController?.abort();
      streamController = new AbortController();
      void receiveMessageStream({
        signal: streamController.signal, cursor: streamCursorRef.current, account: currentUser.id,
        onAccountChange: () => {
          if (disposed) return;
          setCurrentUser(null); setConversations([]); setMessages([]); setLoading(true);
          void loadBootstrap();
        },
        onState: state => {
          if (disposed) return;
          streamConnected = state === 'connected';
          setStreamState(state);
          if (streamConnected) receiveEvent(); // Catch up after a disconnected interval.
        },
        onEvent: receiveEvent,
        onAuthenticationError: async error => { if (!disposed && pageIsVisible()) await recoverSessionNavigation(error); },
      }).catch(() => { if (!disposed) setStreamState('offline'); });
    };
    const receiveVisibility = () => {
      if (!pageIsVisible()) { streamController?.abort(); readController?.abort(); streamConnected = false; return; }
      if (streamingSupported && mutationCountRef.current === 0 && selectionLoadingRef.current === null) {
        if (!bootstrapLifecycleRef.current.pending) void loadBootstrap().finally(startStream);
        return;
      }
      else triggerRefresh();
      startStream();
    };
    triggerRefresh();
    startStream();
    const timer = window.setInterval(triggerRefresh, MESSAGE_REFRESH_INTERVAL_MS);
    const receiveFocus = () => { if (streamingSupported) receiveVisibility(); else triggerRefresh(); };
    window.addEventListener("focus", receiveFocus);
    document.addEventListener("visibilitychange", receiveVisibility);
    return () => {
      disposed = true;
      streamController?.abort(); readController?.abort();
      if (eventTimer !== undefined) window.clearTimeout(eventTimer);
      if (bootstrapWaitTimer !== undefined) window.clearTimeout(bootstrapWaitTimer);
      window.clearInterval(timer);
      window.removeEventListener("focus", receiveFocus);
      document.removeEventListener("visibilitychange", receiveVisibility);
    };
  }, [currentUser, loading, recoverSessionNavigation, confirmThread, loadBootstrap, streamRetry]);

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

  const loadConversationMessages = async (conversationId: MessagingContactId, { fromHistory = false } = {}) => {
    if (navigationStartedRef.current || !bootstrapLifecycleRef.current.mounted) return;
    lastUrlConversation.current = String(conversationId);
    if (!fromHistory) pageUrl.update({ conversation: String(conversationId) });
    selectionReadRef.current?.abort();
    const controller = new AbortController();
    selectionReadRef.current = controller;
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
      const response = await messageClient.getConversationMessages(conversationId, controller.signal);
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

  useEffect(() => {
    if (!pageUrl.ready || loading || !currentUser || pageUrl.state.conversation === lastUrlConversation.current) return;
    lastUrlConversation.current = pageUrl.state.conversation;
    const target = pageUrl.state.conversation || (conversations.some(conversation => idsMatch(conversation.id, defaultConversationRef.current)) ? defaultConversationRef.current : conversations[0]?.id ?? '');
    if (target !== '' && !idsMatch(target, activeConversationRef.current)) void loadConversationMessages(target, { fromHistory: true });
  }, [pageUrl.ready, pageUrl.state.conversation, loading, currentUser, conversations]);

  const handleSendMessage = async (payload: SendMessagePayload) => {
    // A captured callback must not send to the previous or unconfirmed thread,
    // even before React renders the disabled composer. Known current histories
    // remain usable while a refresh is pending; mutation invalidates that read.
    if (navigationStartedRef.current || senderIdentityRef.current !== senderIdentity ||
        !bootstrapLifecycleRef.current.mounted ||
        !idsMatch(activeConversationRef.current, payload.conversationId) ||
        !confirmedConversationIds.has(String(payload.conversationId))) return false;
    const draftAttachments = payload.attachments ?? [];
    if (!payload.conversationId || (payload.content.trim().length === 0 && draftAttachments.length === 0)) {
      return false;
    }

    const conversationId = payload.conversationId;
    const key = String(conversationId);
    if (pendingSendsRef.current.has(key)) return false;
    const request = Symbol();
    pendingSendsRef.current.set(key, request);
    const isOwned = () => bootstrapLifecycleRef.current.mounted && !navigationStartedRef.current &&
      senderIdentityRef.current === senderIdentity && pendingSendsRef.current.get(key) === request;
    const signature = sendDraftSignature(payload);

    setError(null);
    beginMutation();

    try {
      // BFF_Message does not store attachments yet (POST /attachments answers 503, `attachmentIds` must be
      // empty): a draft carrying files is refused here, before any network call (MAIR-512).
      if (draftAttachments.length > 0 && !attachmentPort.upload) throw new Error(ATTACHMENTS_UNAVAILABLE_MESSAGE);
      const unconfirmed = unconfirmedSendsRef.current.get(key);
      if (unconfirmed) {
        // A successful but unrelated/incomplete receipt may already represent a
        // persisted write. Retry only its read; never repeat that POST implicitly.
        const fresh = await messageClient.getConversationMessages(payload.conversationId);
        if (!isOwned()) return false;
        if (!idsMatch(fresh?.conversation?.id, payload.conversationId) || !Array.isArray(fresh?.messages) ||
            fresh.messages.some(message => !idsMatch(payload.conversationId, message.conversationId))) {
          throw new Error("L’envoi reste à confirmer. Vos saisies sont conservées ; réessayez pour vérifier le fil.");
        }
        setConversations(current => upsertConversation(current, fresh.conversation));
        setMessages(current => replaceConversationMessages(current, conversationId, fresh.messages));
        const confirmed = unconfirmed.messageId !== null && fresh.messages.some(message =>
          idsMatch(message.id, unconfirmed.messageId ?? undefined) &&
          idsMatch(payload.conversationId, message.conversationId));
        if (!confirmed) {
          throw new Error("L’envoi reste à confirmer. Vos saisies sont conservées ; réessayez pour vérifier le fil.");
        }
        unconfirmedSendsRef.current.delete(key);
        if (signature !== unconfirmed.draft) {
          if (idsMatch(activeConversationRef.current, payload.conversationId)) {
            setError("Le message initial est confirmé. Vos nouvelles saisies sont conservées ; vous pouvez les envoyer.");
          }
          return false;
        }
        draftAttachments.forEach(attachment => {
          if (attachment.url?.startsWith("blob:")) {
            try { URL.revokeObjectURL?.(attachment.url); } catch { /* Preview cleanup cannot reject confirmation. */ }
          }
        });
        return true;
      }
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
        const uploaded = await uploadDraftAttachments(attachmentPort, files);
        if (!isOwned()) return false;
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
        mentionIds: toMentionIds(payload.mentions),
      });

      if (!isOwned()) return false;
      if (!hasServerId(response?.message?.id) ||
          !idsMatch(response?.message?.conversationId, payload.conversationId) ||
          !idsMatch(response?.conversation?.id, payload.conversationId)) {
        unconfirmedSendsRef.current.set(key, {
          messageId: hasServerId(response?.message?.id) ? response.message.id : null,
          draft: signature,
        });
        throw new Error("L’envoi reste à confirmer. Vos saisies sont conservées ; réessayez pour vérifier le fil.");
      }

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
      if (isOwned() && idsMatch(activeConversationRef.current, payload.conversationId) &&
          pageIsVisible() && unconfirmedSendsRef.current.has(key) &&
          await recoverSessionNavigation(sendError)) return false;
      if (isOwned() && idsMatch(activeConversationRef.current, payload.conversationId)) {
        setError(describeBffError(sendError, "Le message n’a pas pu être envoyé."));
      }
      return false;
    } finally {
      if (pendingSendsRef.current.get(key) === request) pendingSendsRef.current.delete(key);
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
      lastUrlConversation.current = String(response.conversation.id);
      pageUrl.update({ conversation: String(response.conversation.id) });
      confirmThread(response.conversation.id);
      activeConversationRef.current = response.conversation.id;
      setShowConversationList(false);
      return true;
    } catch (sendError) {
      setError(describeBffError(sendError, "Le message direct n’a pas pu être créé."));
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
      lastUrlConversation.current = String(response.conversation.id);
      pageUrl.update({ conversation: String(response.conversation.id) });
      confirmThread(response.conversation.id);
      activeConversationRef.current = response.conversation.id;
      setShowConversationList(false);
      return true;
    } catch (createError) {
      setError(describeBffError(createError, "Le groupe n’a pas pu être créé."));
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
          lastUrlConversation.current = String(fallbackId);
          pageUrl.update({ conversation: String(fallbackId) }, "replace");
          if (!fallbackId) setShowConversationList(true);
          else void loadConversationMessages(fallbackId);
        }
        setConversations((currentConversations) => currentConversations.filter(
          (conversation) => !idsMatch(conversation.id, conversationToDelete.id),
        ));
        unconfirmedSendsRef.current.delete(String(conversationToDelete.id));
        pendingSendsRef.current.delete(String(conversationToDelete.id));
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

  const handleAttach: NonNullable<MessagingProps["onAttach"]> = (files, attachments) => {
    attachments.forEach((attachment, index) => {
      if (files[index]) attachmentFilesRef.current.set(attachment, files[index]);
    });
  };

  const handleAttachmentDownload: NonNullable<MessagingProps['onAttachmentDownload']> = async (attachment,message) => {
    if (!idsMatch(activeConversationRef.current, message.conversationId) || !confirmedMessagesRef.current.some(item => idsMatch(item.id,message.id))) throw new Error('Sélectionnez à nouveau la conversation avant de télécharger ce fichier.');
    downloadRef.current?.abort(); const controller = new AbortController(); downloadRef.current = controller;
    const owner = senderIdentityRef.current;
    try {
      const file = await receiveAttachment(attachmentPort,String(attachment.id),String(message.conversationId),controller.signal);
      if (controller.signal.aborted || senderIdentityRef.current !== owner || !idsMatch(activeConversationRef.current,message.conversationId)) throw new Error('Le téléchargement a été annulé après le changement de conversation.');
      const url = URL.createObjectURL(file.blob); const link = document.createElement('a');
      link.href = url; link.download = file.fileName; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url),1000);
    } finally { if (downloadRef.current === controller) downloadRef.current = null; }
  };

  return {
    streamState,
    retryReception: () => setStreamRetry(retry => retry + 1),
    handleAttachmentDownload: attachmentPort.download ? handleAttachmentDownload : undefined,
    // The shared composer always offers "Joindre un fichier"; without an upload capability the files are not
    // registered and a draft carrying them is refused by handleSendMessage.
    handleAttach: attachmentPort.upload ? handleAttach : undefined,
    loading,
    currentUser,
    bootstrapError,
    retryBootstrap,
    deletingConversation,
    error,
    syncError,
    selectionPending,
    threadPlaceholder,
    activeConversationId,
    showConversationList,
    displayedConversations,
    contacts,
    displayedMessages,
    mentionOptions,
    businessReferences,
    hasConfirmedThread,
    loadConversationMessages,
    loadContacts,
    handleSendMessage,
    hasConfirmedMessages,
    handleReadVisibleMessages,
    handleNewMessageSend,
    handleCreateGroup,
    handleConversationDelete,
    toggleConversationList: () => setShowConversationList((current) => !current),
  };
}
