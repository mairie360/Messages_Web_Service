# Messages BFF Contract

Ce document decrit les donnees dont le frontend **Messages** a besoin pour communiquer avec le BFF Message.

Le frontend affiche la messagerie interne via les composants `@mairie360/lib-components`, principalement `Messaging`.

## Objectif BFF

Le BFF doit fournir au frontend :

- la liste des conversations visibles par l'utilisateur connecte ;
- les messages d'une conversation ;
- les contacts disponibles pour creer un message direct ou un groupe ;
- les actions d'ecriture : envoyer un message, creer un groupe, supprimer/masquer une conversation, gerer les pieces jointes ;
- les compteurs non lus et l'etat de presence si disponible.

Le package OpenAPI actuel `@mairie360/bff-message-openapi@0.2.1` expose seulement `/health` et `/check_apis`. Les routes ci-dessous sont le contrat cible attendu par le frontend.

## Types attendus

Les donnees doivent rester serialisables JSON. Les champs `content` et `lastMessage` sont des chaines cote API, meme si le composant UI accepte du `ReactNode`.

```ts
type Id = string | number;

type ConversationKind = "direct" | "group";
type Presence = "online" | "offline" | "away";
type MessageDirection = "incoming" | "outgoing";

type ConversationDto = {
  id: Id;
  name: string;
  department?: string;
  kind?: ConversationKind;
  avatarUrl?: string;
  initials?: string;
  presence?: Presence;
  lastMessage?: string;
  lastMessageAt?: string; // ISO recommande, ex: "2026-06-23T12:32:00Z"
  unreadCount?: number;
};

type MessageDto = {
  id: Id;
  conversationId: Id;
  content: string;
  sentAt: string; // ISO recommande
  authorId: Id;
  authorName?: string;
  direction?: MessageDirection; // optionnel si le frontend a currentUserId
  attachments?: AttachmentDto[];
  mentions?: MentionDto[];
};

type AttachmentDto = {
  id: Id;
  name: string;
  size?: number;
  type?: string;
  url?: string;
};

type MentionDto = {
  id: Id;
  name: string;
  kind?: ConversationKind;
  description?: string;
};

type ContactDto = {
  id: Id;
  name: string;
  department?: string;
  avatarUrl?: string;
  initials?: string;
  presence?: Presence;
};
```

## Routes de lecture

### `GET /conversations`

Retourne la liste des conversations triees par activite recente.

Query utile :

- `search?: string`
- `limit?: number`
- `cursor?: string`

Reponse :

```ts
type ConversationsResponse = {
  conversations: ConversationDto[];
  nextCursor?: string;
};
```

### `GET /conversations/{conversationId}/messages`

Retourne les messages d'une conversation, idealement du plus ancien au plus recent pour affichage direct.

Query utile :

- `limit?: number`
- `before?: string`
- `after?: string`

Reponse :

```ts
type MessagesResponse = {
  conversation: ConversationDto;
  messages: MessageDto[];
  nextCursor?: string;
};
```

### `GET /contacts`

Alimente les modales "Nouveau message" et "Creer un groupe".

Query utile :

- `search?: string`
- `limit?: number`

Reponse :

```ts
type ContactsResponse = {
  contacts: ContactDto[];
};
```

## Routes d'ecriture

### `POST /conversations/{conversationId}/messages`

Envoie un message dans une conversation existante.

Payload envoye par le frontend :

```ts
type SendMessageRequest = {
  content: string;
  attachmentIds?: Id[];
  mentionIds?: Id[];
};
```

Reponse attendue :

```ts
type SendMessageResponse = {
  message: MessageDto;
  conversation: ConversationDto; // preview mise a jour: lastMessage, lastMessageAt, unreadCount
};
```

### `POST /direct-messages`

Cree ou retrouve une conversation directe, puis envoie le premier message.

Payload :

```ts
type NewDirectMessageRequest = {
  recipientId: Id;
  message: string;
};
```

Reponse :

```ts
type NewDirectMessageResponse = {
  conversation: ConversationDto;
  message: MessageDto;
};
```

### `POST /groups`

Cree une conversation de groupe.

Payload :

```ts
type CreateGroupRequest = {
  name: string;
  description?: string;
  memberIds: Id[];
};
```

Reponse :

```ts
type CreateGroupResponse = {
  conversation: ConversationDto;
};
```

### `DELETE /conversations/{conversationId}`

Supprime ou masque une conversation pour l'utilisateur courant.

Reponse minimale :

```ts
type DeleteConversationResponse = {
  deleted: true;
  conversationId: Id;
};
```

### `POST /conversations/{conversationId}/read`

Marque une conversation comme lue.

Payload :

```ts
type MarkConversationReadRequest = {
  readUntilMessageId?: Id;
};
```

Reponse :

```ts
type MarkConversationReadResponse = {
  conversationId: Id;
  unreadCount: 0;
};
```

## Pieces jointes

Le composant frontend expose les fichiers selectionnes avant envoi. Le BFF peut gerer l'upload en deux temps :

### `POST /attachments`

Payload `multipart/form-data` :

- `files`: un ou plusieurs fichiers

Reponse :

```ts
type UploadAttachmentsResponse = {
  attachments: AttachmentDto[];
};
```

Ensuite, le frontend envoie `attachmentIds` dans `POST /conversations/{conversationId}/messages`.

## Donnees minimales pour afficher l'ecran actuel

Pour remplacer les mocks de `src/app/page.tsx`, le frontend a besoin au chargement de :

```ts
type MessagingBootstrapResponse = {
  currentUser: {
    id: Id;
    name: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  };
  conversations: ConversationDto[];
  activeConversationId?: Id;
  messages: MessageDto[];
};
```

Route possible :

```text
GET /messaging/bootstrap
```

Cette route n'est pas obligatoire si le frontend appelle separement `/me`, `/conversations` et `/conversations/{id}/messages`, mais elle simplifie le premier rendu.

## Regles metier utiles au frontend

- `id` doit etre stable et unique.
- `sentAt` et `lastMessageAt` devraient etre fournis en ISO 8601. Le frontend formatera en `HH:mm`, `Hier`, etc.
- `unreadCount` est le nombre de messages non lus pour l'utilisateur courant.
- `direction` peut etre calculee cote frontend si `authorId === currentUser.id`; sinon le BFF peut l'envoyer directement.
- `lastMessage` doit etre une version texte courte du dernier message.
- `avatarUrl` est optionnel ; si absent, le frontend affiche `initials`.
- `presence` est optionnel, mais les valeurs attendues sont `online`, `offline`, `away`.
- Une conversation de groupe doit avoir `kind: "group"` et une liste de membres disponible via une route detail si necessaire.

## Erreurs attendues

Format conseille :

```ts
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

Codes HTTP attendus :

- `400` payload invalide ;
- `401` utilisateur non authentifie ;
- `403` conversation non accessible ;
- `404` conversation/contact/message introuvable ;
- `413` piece jointe trop lourde ;
- `422` regle metier non respectee ;
- `500` erreur serveur ;
- `502` API Core ou Message indisponible.

## Mapping avec `@mairie360/lib-components`

Le composant principal consomme ces props :

```tsx
<Messaging
  conversations={conversations}
  messages={messages}
  activeConversationId={activeConversationId}
  currentUserId={currentUser.id}
  onConversationSelect={...}
  onSendMessage={...}
  onNewMessageSend={...}
  onCreateGroup={...}
  onConversationDelete={...}
/>
```

Les callbacks envoient actuellement ces payloads :

```ts
type MessagingSendMessagePayload = {
  conversationId?: Id;
  content: string;
  attachments?: AttachmentDto[];
  mentions?: MentionDto[];
};

type NewMessagePayload = {
  recipientId: Id;
  message: string;
};

type CreateGroupPayload = {
  name: string;
  description?: string;
  memberIds: Id[];
};
```
