import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { CreateGroupModal } from './components/CreateGroupModal';
import { Messaging } from './Messaging';
import type { MessagingMembers } from './messaging-types';
import { MessagingComposer } from './components/ConversationComposers/components/MessagingComposer';
import { MessagingConversationItem } from './components/MessagingSidebar/components/ConversationList/components/MessagingConversationItem';
import { MessagingSidebar } from './components/MessagingSidebar';
import { NewMessageModal } from './components/NewMessageModal';
import { presentMessageAuthors } from '@/lib/message-authors';
import {
  defaultMessagingBusinessReferences,
  defaultMessagingConversations,
  defaultMessagingMessages,
} from '@tests/component/messaging/messaging-fixtures';

const DemoMessaging = (props: ComponentProps<typeof Messaging>) => (
  <Messaging
    conversations={defaultMessagingConversations}
    messages={defaultMessagingMessages}
    businessReferences={defaultMessagingBusinessReferences}
    onSendMessage={vi.fn()}
    onNewMessageSend={vi.fn()}
    onCreateGroup={vi.fn()}
    {...props}
  />
);

/** MAIR-1157: « Nouveau message » and « Créer un groupe » live in the « + » menu of the list. */
const openFromNewConversationMenu = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Nouvelle conversation' }));
  fireEvent.click(screen.getByRole('menuitem', { name }));
};

describe('Messaging components', () => {
  it('renders no demo content or unsupported actions by default', () => {
    render(<Messaging />);

    expect(screen.getByRole('heading', { name: 'Messagerie' })).toBeInTheDocument();
    // MAIR-1171: a short text in the list, the illustrated state in the thread only.
    expect(screen.getByText('Aucune conversation pour l’instant.')).toBeInTheDocument();
    expect(screen.getByText('Commencez à échanger')).toBeInTheDocument();
    expect(screen.queryByText('Marie Dubois')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nouvelle conversation' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toBeDisabled();
  });

  it('keeps an explicitly configured sidebar title', () => {
    render(<MessagingSidebar conversations={[]} title="Échanges de l’équipe" />);

    expect(screen.getByRole('heading', { name: 'Échanges de l’équipe' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Messagerie' })).not.toBeInTheDocument();
  });

  it('renders explicitly provided conversations and messages', () => {
    render(<DemoMessaging />);

    expect(screen.getAllByText('Marie Dubois')[0]).toBeInTheDocument();
    expect(screen.getByText('Parfait, quelles sont vos conclusions ?')).toBeInTheDocument();
  });

  it('MAIR-1157 truncates a long conversation name beside its timestamp without losing metadata or selection', () => {
    const onClick = vi.fn();
    const name = 'Équipe de coordination du projet de rénovation des bâtiments municipaux';
    render(
      <MessagingConversationItem
        conversation={{
          id: 'municipal-buildings',
          name,
          kind: 'group',
          department: 'Services techniques',
          lastMessageAt: '27/09 14:42',
          lastMessage: 'Réunion confirmée',
          unreadCount: 3,
        }}
        onClick={onClick}
      />
    );

    const item = screen.getByRole('button', { name: /Équipe de coordination du projet/ });
    const nameElement = screen.getByText(name);
    // MAIR-1157: one truncated line for the name (full name kept in the accessible name), the time beside it.
    expect(nameElement).toHaveClass('truncate');
    expect(item).toHaveAccessibleName(expect.stringContaining(name));
    expect(item).toHaveTextContent('27/09 14:42');
    expect(item).toHaveTextContent('Réunion confirmée');
    expect(item).toHaveTextContent('3');
    item.focus();
    expect(item).toHaveFocus();
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('filters conversations from the sidebar search', () => {
    render(<DemoMessaging />);

    fireEvent.change(screen.getByPlaceholderText('Rechercher une conversation'), {
      target: { value: 'Sophie' },
    });

    expect(screen.getAllByText('Sophie Leroy')[0]).toBeInTheDocument();
    expect(screen.queryByText('Pierre Martin')).not.toBeInTheDocument();
  });

  it('switches the visible conversation when the consumer has not fixed the active id', () => {
    const handleConversationSelect = vi.fn();
    render(<DemoMessaging onConversationSelect={handleConversationSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Pierre Martin/ }));

    expect(handleConversationSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'pierre-martin' }));
    expect(screen.getByRole('heading', { name: 'Pierre Martin' })).toBeInTheDocument();
  });

  it('does not show the available users strip in the messaging sidebar', () => {
    render(<DemoMessaging />);

    expect(screen.queryByLabelText('Utilisateurs disponibles')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ouvrir la discussion avec Pierre Martin' })
    ).not.toBeInTheDocument();
  });

  it('calls onSendMessage when a message is submitted', () => {
    const handleSendMessage = vi.fn();
    render(<DemoMessaging onSendMessage={handleSendMessage} />);

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), {
      target: { value: 'Message de test' },
    });
    fireEvent.click(screen.getByLabelText('Envoyer'));

    expect(handleSendMessage).toHaveBeenCalledWith({
      conversationId: 'marie-dubois',
      content: 'Message de test',
    });
  });

  it('receives incoming messages passed to the module', () => {
    const { rerender } = render(<DemoMessaging />);

    rerender(
      <DemoMessaging
        incomingMessages={[
          {
            id: 'incoming-delayed-message',
            conversationId: 'marie-dubois',
            content: 'Message reçu en différé',
            sentAt: '15:02',
            authorId: 'marie-dubois',
          },
        ]}
      />
    );

    expect(screen.getAllByText('Message reçu en différé')[0]).toBeInTheDocument();
  });

  it('MAIR-1160 drops the unread banner: the thread shows the separator and the pill of the open conversation', () => {
    const conversation = { id: 'c1', name: 'Conseil municipal – élus', kind: 'group' as const, unreadCount: 2 };
    const thread = [
      { id: 'a', conversationId: 'c1', content: 'Ancien', authorId: 'u2' },
      { id: 'b', conversationId: 'c1', content: 'Nouveau 1', authorId: 'u2' },
      { id: 'c', conversationId: 'c1', content: 'Nouveau 2', authorId: 'u2' },
    ];
    render(<Messaging conversations={[conversation]} messages={thread} activeConversationId="c1" currentUserId="me" />);
    expect(screen.queryByRole('status', { name: 'Notifications de messagerie' })).toBeNull();
    expect(screen.queryByText(/notifications? non lues?/)).toBeNull();
    expect(screen.getByRole('separator', { name: 'Nouveaux messages' }).nextElementSibling).toHaveAttribute('data-messaging-message-id', 'b');
  });

  it('opens the correct modal from each sidebar icon', () => {
    render(<DemoMessaging />);

    openFromNewConversationMenu('Nouveau message');
    expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fermer'));

    openFromNewConversationMenu('Créer un groupe');
    expect(screen.getByRole('dialog', { name: 'Créer un groupe' })).toBeInTheDocument();
  });

  it('delegates direct-message creation and closes the modal after submission', () => {
    const handleNewMessageSend = vi.fn();
    render(<DemoMessaging onNewMessageSend={handleNewMessageSend} />);

    openFromNewConversationMenu('Nouveau message');
    fireEvent.change(screen.getByLabelText('Destinataire'), {
      target: { value: 'pierre-martin' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Bonjour Pierre' },
    });
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Nouveau message' })).getByRole('button', { name: 'Envoyer' }));

    expect(handleNewMessageSend).toHaveBeenCalledWith({
      recipientId: 'pierre-martin',
      message: 'Bonjour Pierre',
    });
    expect(screen.queryByRole('dialog', { name: 'Nouveau message' })).not.toBeInTheDocument();
  });

  it('uses dedicated contacts in the new message and group modals', () => {
    const contacts = [
      {
        id: 'alice-martin',
        name: 'Alice Martin',
        department: 'Urbanisme',
        kind: 'direct' as const,
      },
    ];

    render(
      <DemoMessaging
        conversations={[defaultMessagingConversations[0]]}
        contacts={contacts}
        messages={[]}
        activeConversationId={defaultMessagingConversations[0].id}
      />
    );

    openFromNewConversationMenu('Nouveau message');
    expect(screen.getByRole('option', { name: 'Alice Martin - Urbanisme' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fermer'));

    openFromNewConversationMenu('Créer un groupe');
    expect(screen.getByLabelText('Alice Martin - Urbanisme')).toBeInTheDocument();
  });

  it('uses author ids before backend direction and normalizes numeric ids', () => {
    render(
      <Messaging
        conversations={[{ id: 100, name: 'Conversation test', kind: 'direct' }]}
        messages={[
          {
            id: 'own-message',
            conversationId: 100,
            content: 'Message de l’utilisateur courant',
            authorId: '7',
            direction: 'incoming',
          },
          {
            id: 'other-message',
            conversationId: '100',
            content: 'Message de l’autre personne',
            authorId: 8,
            direction: 'outgoing',
          },
        ]}
        activeConversationId="100"
        currentUserId={7}
      />
    );

    expect(screen.getByText('Message de l’utilisateur courant').parentElement?.parentElement).toHaveClass(
      'items-end'
    );
    expect(screen.getByText('Message de l’autre personne').parentElement?.parentElement).toHaveClass(
      'items-start'
    );
  });

  it('delegates deletion without hiding a conversation before the consumer updates it', () => {
    const handleDelete = vi.fn();
    render(<DemoMessaging onConversationDelete={handleDelete} />);

    fireEvent.click(screen.getByLabelText("Plus d'actions"));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Supprimer la conversation' }));
    // MAIR-1163: the deletion is confirmed first.
    expect(handleDelete).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));

    expect(handleDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'marie-dubois' }));
    expect(screen.getByText('Bonjour Jean, j\'ai examiné le dossier du projet de rénovation.')).toBeInTheDocument();
    expect(screen.getAllByText('Pierre Martin')[0]).toBeInTheDocument();
  });

  it('MAIR-1158 shows the calls as unavailable and dismisses the actions menu on outside click', () => {
    const handleMoreActions = vi.fn();
    render(<DemoMessaging onMoreActions={handleMoreActions} onConversationDelete={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Appeler' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Lancer une visio' })).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
    expect(handleMoreActions).toHaveBeenCalledWith(expect.objectContaining({ id: 'marie-dubois' }));
    expect(screen.getByRole('menuitem', { name: 'Supprimer la conversation' })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menuitem', { name: 'Supprimer la conversation' })).not.toBeInTheDocument();
  });

  it('delegates sending without fabricating a persisted message', () => {
    const handleSendMessage = vi.fn();
    render(<Messaging conversations={[defaultMessagingConversations[0]]} onSendMessage={handleSendMessage} />);

    expect(screen.getByRole('button', { name: 'Appeler' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: "Plus d'actions" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), {
      target: { value: 'Message en attente du serveur' },
    });
    fireEvent.click(screen.getByLabelText('Envoyer'));

    expect(handleSendMessage).toHaveBeenCalledWith({
      conversationId: 'marie-dubois',
      content: 'Message en attente du serveur',
    });
    expect(screen.queryByText('Message en attente du serveur')).not.toBeInTheDocument();
    expect(screen.getByText('Aucun message pour l’instant')).toBeInTheDocument();
  });

  it('delegates group creation without inventing a local conversation', () => {
    const handleCreateGroup = vi.fn();
    render(<Messaging conversations={[defaultMessagingConversations[0]]} onCreateGroup={handleCreateGroup} />);

    openFromNewConversationMenu('Créer un groupe');
    fireEvent.change(screen.getByLabelText('Nom du groupe'), { target: { value: 'Groupe test' } });
    fireEvent.click(screen.getByLabelText('Marie Dubois - Finances'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le groupe' }));

    expect(handleCreateGroup).toHaveBeenCalledWith({
      name: 'Groupe test',
      description: undefined,
      memberIds: ['marie-dubois'],
    });
    expect(screen.queryByText('Groupe test')).not.toBeInTheDocument();
  });

  it('only displays incoming messages while they are provided by the consumer', () => {
    const incomingMessages = [{ id: 'server-message', conversationId: 'marie-dubois', content: 'Message reçu' }];
    const { rerender } = render(
      <Messaging conversations={[defaultMessagingConversations[0]]} incomingMessages={incomingMessages} />
    );

    expect(screen.getByText('Message reçu')).toBeInTheDocument();
    rerender(<Messaging conversations={[defaultMessagingConversations[0]]} incomingMessages={[]} />);
    expect(screen.queryByText('Message reçu')).not.toBeInTheDocument();
  });

  it('renders references and attachments without destinations as non-clickable labels', () => {
    render(
      <Messaging
        conversations={[defaultMessagingConversations[0]]}
        messages={[
          {
            id: 'message-with-unavailable-links',
            conversationId: 'marie-dubois',
            content: 'Dossier partagé',
            businessLinks: [{ id: 'project-1', title: 'Projet test', kind: 'project' }],
            attachments: [{ id: 'file-1', name: 'rapport.pdf' }],
          },
        ]}
      />
    );

    expect(screen.getByText('Projet test')).toBeInTheDocument();
    expect(screen.getByText('rapport.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Projet · Projet test' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'rapport.pdf' })).not.toBeInTheDocument();
  });

  it('delegates business-reference actions and exposes real attachment URLs', () => {
    const handleBusinessReferenceClick = vi.fn();
    const project = { id: 'project-1', title: 'Projet test', kind: 'project' as const };
    const event = { id: 'event-1', title: 'Conseil municipal', kind: 'event' as const, href: '/events/1' };
    render(
      <Messaging
        conversations={[defaultMessagingConversations[0]]}
        messages={[
          {
            id: 'linked-message',
            conversationId: 'marie-dubois',
            content: 'Pièces liées',
            businessLinks: [project, event],
            attachments: [{ id: 'file-1', name: 'rapport.pdf', url: '/files/1' }],
          },
        ]}
        onBusinessReferenceClick={handleBusinessReferenceClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Projet · Projet test' }));
    fireEvent.click(screen.getByRole('link', { name: 'Événement · Conseil municipal' }));
    expect(handleBusinessReferenceClick).toHaveBeenNthCalledWith(1, project);
    expect(handleBusinessReferenceClick).toHaveBeenNthCalledWith(2, event);
    expect(screen.getByRole('link', { name: 'rapport.pdf' })).toHaveAttribute('href', '/files/1');
  });

  it('adds a system emoji to the composer', () => {
    render(<DemoMessaging />);

    fireEvent.click(screen.getByLabelText('Insérer un emoji'));
    fireEvent.click(screen.getByLabelText('Ajouter 👍'));

    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('👍');
  });

  it('adds files to a message payload', () => {
    const handleSendMessage = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:planning.pdf'),
    });
    const { container } = render(<DemoMessaging onSendMessage={handleSendMessage} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['planning'], 'planning.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByLabelText('Envoyer'));

    expect(screen.queryByRole('link', { name: /planning\.pdf/ })).not.toBeInTheDocument();
    expect(handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'marie-dubois',
        content: 'Pièce jointe',
        attachments: [
          expect.objectContaining({
            name: 'planning.pdf',
            type: 'application/pdf',
            url: 'blob:planning.pdf',
          }),
        ],
      })
    );
  });

  it('keeps text, references and attachments after a refused send, then clears them on retry success', async () => {
    let resolveFirstSend!: (confirmed: boolean) => void;
    const firstSend = new Promise<boolean>((resolve) => { resolveFirstSend = resolve; });
    const onSendMessage = vi.fn().mockReturnValueOnce(firstSend).mockResolvedValueOnce(true);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:retry.pdf'),
    });
    const { container } = render(
      <MessagingComposer
        mentionOptions={[{ id: 'marie', name: 'Marie', kind: 'direct' }]}
        businessReferenceOptions={[{ id: 'project-1', title: 'Projet mairie', kind: 'project' }]}
        onSendMessage={onSendMessage}
      />
    );
    const input = screen.getByPlaceholderText(/^Écrire un message/);
    fireEvent.change(input, { target: { value: '@Mar' } });
    fireEvent.click(screen.getByRole('option', { name: /@Marie/ }));
    fireEvent.change(input, { target: { value: '@Marie #Projet' } });
    fireEvent.click(screen.getByRole('option', { name: /#Projet mairie/ }));
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['draft'], 'retry.pdf', { type: 'application/pdf' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(input).toBeDisabled();
    expect(screen.getByText('retry.pdf')).toBeInTheDocument();
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(onSendMessage).toHaveBeenCalledTimes(1);

    await act(async () => { resolveFirstSend(false); await firstSend; });
    expect(input).toHaveValue('@Marie #Projet mairie ');
    expect(screen.getByText('retry.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(onSendMessage.mock.calls[1]).toEqual(onSendMessage.mock.calls[0]);
    expect(onSendMessage.mock.calls[1][2]).toEqual([expect.objectContaining({ id: 'marie' })]);
    expect(onSendMessage.mock.calls[1][3]).toEqual([expect.objectContaining({ id: 'project-1' })]);
    expect(screen.queryByText('retry.pdf')).not.toBeInTheDocument();
  });

  it('keeps the composer draft when an asynchronous sender rejects', async () => {
    const onSendMessage = vi.fn().mockRejectedValueOnce(new Error('network')).mockReturnValueOnce(true);
    render(<MessagingComposer onSendMessage={onSendMessage} />);
    const input = screen.getByPlaceholderText(/^Écrire un message/);
    fireEvent.change(input, { target: { value: 'Message à réessayer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Envoyer' })).toBeEnabled());
    expect(input).toHaveValue('Message à réessayer');
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(input).toHaveValue('');
  });

  it('removes an attached file before sending', () => {
    const handleSendMessage = vi.fn();
    const { container } = render(<DemoMessaging onSendMessage={handleSendMessage} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: { files: [new File(['draft'], 'brouillon.pdf', { type: 'application/pdf' })] },
    });
    expect(screen.getByText('brouillon.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retirer brouillon.pdf' }));

    expect(screen.queryByText('brouillon.pdf')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    expect(handleSendMessage).not.toHaveBeenCalled();
  });

  it('mentions a contact or group with @ and sends mention metadata', () => {
    const handleSendMessage = vi.fn();
    render(<DemoMessaging onSendMessage={handleSendMessage} />);

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), {
      target: { value: '@Éq' },
    });
    fireEvent.click(screen.getByText('@Équipe Direction'));
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('@Équipe Direction ');

    fireEvent.click(screen.getByLabelText('Envoyer'));

    expect(handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'marie-dubois',
        content: '@Équipe Direction',
        mentions: [
          expect.objectContaining({
            id: 'equipe-direction',
            name: 'Équipe Direction',
            kind: 'group',
          }),
        ],
      })
    );
  });

  it('offers dedicated contacts and group conversations as user mentions', () => {
    render(
      <Messaging
        conversations={[
          {
            id: 'group-culture',
            name: 'Groupe Culture',
            kind: 'group',
          },
        ]}
        contacts={[
          {
            id: 'user-alice',
            name: 'Alice Martin',
            department: 'Urbanisme',
            kind: 'direct',
          },
        ]}
        messages={[]}
        activeConversationId="group-culture"
        onSendMessage={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), {
      target: { value: '@' },
    });

    expect(screen.getByText('@Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('@Groupe Culture')).toBeInTheDocument();
  });

  it('renders user and business mentions in bold with an underline', () => {
    render(
      <Messaging
        conversations={[{ id: 'group-culture', name: 'Groupe Culture', kind: 'group' }]}
        contacts={[{ id: 'user-alice', name: 'Alice Martin', kind: 'direct' }]}
        messages={[
          {
            id: 'message-with-mentions',
            conversationId: 'group-culture',
            content: 'Bonjour @Alice Martin, consultez #Rénovation mairie.',
            direction: 'incoming',
          },
        ]}
        businessReferences={[
          { id: 'project-renovation', title: 'Rénovation mairie', kind: 'project' },
        ]}
        activeConversationId="group-culture"
      />
    );

    const userMention = screen.getByText('@Alice Martin');
    const businessMention = screen.getByText('#Rénovation mairie');

    expect(userMention.tagName).toBe('STRONG');
    expect(userMention).toHaveClass('font-bold', 'underline');
    expect(userMention).toHaveAttribute('data-mention-kind', 'user');
    expect(businessMention.tagName).toBe('STRONG');
    expect(businessMention).toHaveClass('font-bold', 'underline');
    expect(businessMention).toHaveAttribute('data-mention-kind', 'business');
  });

  it('opens user mention suggestions from the @ toolbar button', () => {
    render(<DemoMessaging />);

    fireEvent.click(screen.getByLabelText('Mentionner une personne'));
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('@');

    fireEvent.click(screen.getByText('@Marie Dubois'));
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('@Marie Dubois ');
  });

  it('mentions a business element with # and sends the linked reference metadata', () => {
    const handleSendMessage = vi.fn();
    render(<DemoMessaging onSendMessage={handleSendMessage} />);

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), {
      target: { value: '#Projet' },
    });
    fireEvent.click(screen.getByText('#Projet rénovation mairie'));
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('#Projet rénovation mairie ');

    fireEvent.click(screen.getByLabelText('Envoyer'));

    expect(handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'marie-dubois',
        content: '#Projet rénovation mairie',
        businessLinks: [
          expect.objectContaining({
            id: 'project-renovation-mairie',
            kind: 'project',
            title: 'Projet rénovation mairie',
          }),
        ],
      })
    );
  });

  it('keeps event references available after six results and filters multi-word titles', () => {
    const handleSendMessage = vi.fn();
    const references = [
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `project-${index}`,
        title: `Projet ${index}`,
        kind: 'project' as const,
      })),
      { id: 'event-1', title: 'Conseil municipal', kind: 'event' as const },
    ];

    render(<MessagingComposer businessReferenceOptions={references} onSendMessage={handleSendMessage} />);

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), { target: { value: '#' } });
    expect(screen.getByRole('option', { name: /#Conseil municipal/ })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), {
      target: { value: '#conseil muni' },
    });
    const eventSuggestion = screen.getByRole('option', { name: /#Conseil municipal/ });
    expect(eventSuggestion).toHaveTextContent('Événement du calendrier');
    expect(eventSuggestion).toHaveAttribute('title', 'Conseil municipal');

    fireEvent.click(eventSuggestion);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(handleSendMessage).toHaveBeenCalledWith(
      '#Conseil municipal',
      [],
      [],
      [expect.objectContaining({ id: 'event-1', kind: 'event' })]
    );
  });

  it('sends contextual message metadata and opens the linked business element', () => {
    const handleSendMessage = vi.fn();
    const handleBusinessReferenceClick = vi.fn();
    const contextReference = {
      id: 'event-conseil-test',
      title: 'Conseil municipal',
      kind: 'event' as const,
      description: 'Événement',
    };

    render(
      <DemoMessaging
        contextReference={contextReference}
        onSendMessage={handleSendMessage}
        onBusinessReferenceClick={handleBusinessReferenceClick}
      />
    );

    expect(screen.getByLabelText('Message contextuel')).toHaveTextContent('Événement : Conseil municipal');
    fireEvent.click(screen.getByText('Ouvrir'));
    expect(handleBusinessReferenceClick).toHaveBeenCalledWith(contextReference);

    fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), {
      target: { value: 'Compte rendu partagé' },
    });
    fireEvent.click(screen.getByLabelText('Envoyer'));

    expect(handleSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'marie-dubois',
        content: 'Compte rendu partagé',
        context: contextReference,
      })
    );
  });

  it('submits a new direct message from the modal', () => {
    const handleSendMessage = vi.fn();

    render(
      <NewMessageModal
        isOpen
        contacts={defaultMessagingConversations}
        onCancel={vi.fn()}
        onSendMessage={handleSendMessage}
      />
    );

    fireEvent.change(screen.getByLabelText('Destinataire'), {
      target: { value: 'pierre-martin' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Bonjour Pierre' },
    });
    fireEvent.click(screen.getByText('Envoyer'));

    expect(handleSendMessage).toHaveBeenCalledWith({
      recipientId: 'pierre-martin',
      message: 'Bonjour Pierre',
    });
  });

  it('keeps the direct-message modal open for retry after a refused send', async () => {
    const onNewMessageSend = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<DemoMessaging onNewMessageSend={onNewMessageSend} />);
    openFromNewConversationMenu('Nouveau message');
    fireEvent.change(screen.getByLabelText('Destinataire'), { target: { value: 'pierre-martin' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Bonjour Pierre' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Envoyer' })).toBeEnabled());
    expect(screen.getByLabelText('Destinataire')).toHaveValue('pierre-martin');
    expect(screen.getByLabelText('Message')).toHaveValue('Bonjour Pierre');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onNewMessageSend).toHaveBeenCalledTimes(2);
    expect(onNewMessageSend.mock.calls[1]).toEqual(onNewMessageSend.mock.calls[0]);
  });

  it('submits a group creation payload from the modal', () => {
    const handleCreateGroup = vi.fn();

    render(
      <CreateGroupModal
        isOpen
        members={defaultMessagingConversations}
        onCancel={vi.fn()}
        onCreateGroup={handleCreateGroup}
      />
    );

    fireEvent.change(screen.getByLabelText('Nom du groupe'), {
      target: { value: 'Groupe projet' },
    });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un contact' }), {
      target: { value: 'Marie' },
    });

    expect(screen.queryByLabelText('Pierre Martin - Urbanisme')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Marie Dubois - Finances'));
    fireEvent.click(screen.getByText('Créer le groupe'));

    expect(handleCreateGroup).toHaveBeenCalledWith({
      name: 'Groupe projet',
      description: undefined,
      memberIds: ['marie-dubois'],
    });
  });

  it.each(['false', 'rejection', 'throw'])('retains a failed group form (%s), then closes only after confirmed retry', async (failure) => {
    const onCreateGroup = vi.fn();
    if (failure === 'false') onCreateGroup.mockReturnValueOnce(false);
    if (failure === 'rejection') onCreateGroup.mockRejectedValueOnce(new Error('Service unavailable'));
    if (failure === 'throw') onCreateGroup.mockImplementationOnce(() => { throw new Error('Service unavailable'); });
    onCreateGroup.mockResolvedValueOnce(true);
    render(<DemoMessaging onCreateGroup={onCreateGroup} />);
    openFromNewConversationMenu('Créer un groupe');
    fireEvent.change(screen.getByLabelText('Nom du groupe'), { target: { value: '  Groupe conservé  ' } });
    fireEvent.change(screen.getByLabelText('Description (optionnel)'), { target: { value: '  Description conservée  ' } });
    fireEvent.click(screen.getByLabelText('Marie Dubois - Finances'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le groupe' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Vos saisies sont conservées'));
    expect(screen.getByLabelText('Nom du groupe')).toHaveValue('  Groupe conservé  ');
    expect(screen.getByLabelText('Description (optionnel)')).toHaveValue('  Description conservée  ');
    expect(screen.getByLabelText('Marie Dubois - Finances')).toBeChecked();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Créer le groupe' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Créer le groupe' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onCreateGroup).toHaveBeenCalledTimes(2);
    expect(onCreateGroup.mock.calls[1]).toEqual(onCreateGroup.mock.calls[0]);
    expect(onCreateGroup.mock.calls[0][0]).toEqual({
      name: 'Groupe conservé', description: 'Description conservée', memberIds: ['marie-dubois'],
    });
    openFromNewConversationMenu('Créer un groupe');
    expect(screen.getByLabelText('Nom du groupe')).toHaveValue('');
    expect(screen.getByLabelText('Description (optionnel)')).toHaveValue('');
    expect(screen.getByLabelText('Marie Dubois - Finances')).not.toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps a pending group open, freezes values and prevents duplicate submissions', async () => {
    let resolveCreation!: (confirmed: boolean) => void;
    const onCreateGroup = vi.fn(() => new Promise<boolean>((resolve) => { resolveCreation = resolve; }));
    render(<DemoMessaging onCreateGroup={onCreateGroup} />);
    openFromNewConversationMenu('Créer un groupe');
    fireEvent.change(screen.getByLabelText('Nom du groupe'), { target: { value: 'Groupe en attente' } });
    fireEvent.change(screen.getByLabelText('Description (optionnel)'), { target: { value: 'Description stable' } });
    fireEvent.click(screen.getByLabelText('Marie Dubois - Finances'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le groupe' }));

    const dialog = screen.getByRole('dialog');
    expect(screen.getByRole('button', { name: 'Création en cours…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toBeDisabled();
    // MAIR-608: the lib Modal keeps its close button enabled; a busy dialog ignores it (lib ConfirmModal rule).
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(screen.getByLabelText('Nom du groupe')).toBeDisabled();
    expect(screen.getByLabelText('Description (optionnel)')).toBeDisabled();
    expect(screen.getByRole('searchbox', { name: 'Rechercher un contact' })).toBeDisabled();
    expect(screen.getByLabelText('Marie Dubois - Finances')).toBeDisabled();
    fireEvent.submit(dialog.querySelector('form')!);
    fireEvent.change(screen.getByLabelText('Nom du groupe'), { target: { value: 'Changed while pending' } });
    fireEvent.change(screen.getByLabelText('Description (optionnel)'), { target: { value: 'Changed' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un contact' }), { target: { value: 'Pierre' } });
    fireEvent.click(screen.getByLabelText('Pierre Martin - Urbanisme'));
    expect(onCreateGroup).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Nom du groupe')).toHaveValue('Groupe en attente');
    expect(screen.getByLabelText('Description (optionnel)')).toHaveValue('Description stable');
    expect(screen.getByRole('searchbox', { name: 'Rechercher un contact' })).toHaveValue('');
    expect(screen.getByLabelText('Marie Dubois - Finances')).toBeChecked();
    expect(screen.getByLabelText('Pierre Martin - Urbanisme')).not.toBeChecked();
    await act(async () => resolveCreation(true));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['synchronous void', 'asynchronous void', 'synchronous true'])('preserves successful group callback compatibility (%s)', async (result) => {
    const onCreateGroup = vi.fn(() => result === 'asynchronous void' ? Promise.resolve() : result === 'synchronous true' ? true : undefined);
    render(<DemoMessaging onCreateGroup={onCreateGroup} />);
    openFromNewConversationMenu('Créer un groupe');
    fireEvent.change(screen.getByLabelText('Nom du groupe'), { target: { value: 'Groupe confirmé' } });
    fireEvent.click(screen.getByLabelText('Marie Dubois - Finances'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le groupe' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onCreateGroup).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Groupe confirmé')).not.toBeInTheDocument();
  });
});

describe('Messaging send status (MAIR-1162)', () => {
  const conversation = { id: 'c1', name: 'Sophie Leroy' };
  const thread = [
    { id: 'm1', conversationId: 'c1', content: 'Bonjour', authorId: 'u2' },
    { id: 'm2', conversationId: 'c1', content: 'Déjà envoyé', authorId: 'me' },
  ];
  const deferred = () => {
    let resolve!: (value: boolean) => void;
    const promise = new Promise<boolean>((done) => { resolve = done; });
    return { promise, resolve };
  };
  const type = (text: string) => fireEvent.change(screen.getByPlaceholderText(/^Écrire un message/), { target: { value: text } });
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
  const announcement = () => document.querySelector('.sr-only[role="status"][aria-live="polite"]');

  it('shows « Envoyé » under my last confirmed message, then « Envoi… » on a dimmed bubble until the send is confirmed', async () => {
    const pending = deferred();
    const onSendMessage = vi.fn(() => pending.promise);
    render(<Messaging conversations={[conversation]} messages={thread} activeConversationId="c1" currentUserId="me" onSendMessage={onSendMessage} />);
    expect(screen.getByText('Déjà envoyé').closest('[data-messaging-message-id]')).toHaveTextContent('Envoyé');
    type('Nouveau message'); submit();
    const bubble = document.querySelector('[data-send-status="sending"][data-direction="outgoing"]')!;
    expect(bubble).toHaveTextContent('Nouveau message'); expect(bubble).toHaveClass('opacity-60');
    expect(screen.getByText('Envoi…')).toBeVisible();
    expect(announcement()).toHaveTextContent('Envoi du message…');
    await act(async () => { pending.resolve(true); await pending.promise; });
    expect(document.querySelector('[data-send-status="sending"]')).toBeNull();
    expect(announcement()).toHaveTextContent('Message envoyé.');
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('');
  });

  it('keeps a failed send as a dashed « Non envoyé » bubble and retries it once without duplicating, releasing the draft', async () => {
    const retry = deferred();
    const onSendMessage = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(() => retry.promise);
    render(<Messaging conversations={[conversation]} messages={thread} activeConversationId="c1" currentUserId="me" onSendMessage={onSendMessage} />);
    type('À renvoyer'); submit();
    await waitFor(() => expect(document.querySelector('[data-send-status="failed"][data-direction="outgoing"]')).not.toBeNull());
    const failed = document.querySelector('[data-send-status="failed"][data-direction="outgoing"]')!;
    expect(failed.className).toContain('!border-dashed');
    expect(screen.getByText('Non envoyé ·')).toBeVisible();
    expect(announcement()).toHaveTextContent('Message non envoyé.');
    // MAIR-370: the composer keeps the draft until a send is confirmed.
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('À renvoyer');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer l’envoi' }));
    expect(screen.getByText('Envoi…')).toBeVisible();
    expect(onSendMessage).toHaveBeenCalledTimes(2);
    expect(onSendMessage.mock.calls[1][0]).toEqual(onSendMessage.mock.calls[0][0]);
    // A second click while it is sending does not write again.
    expect(screen.queryByRole('button', { name: 'Réessayer l’envoi' })).toBeNull();
    submit();
    expect(onSendMessage).toHaveBeenCalledTimes(2);
    await act(async () => { retry.resolve(true); await retry.promise; });
    expect(document.querySelector('[data-send-status="failed"], [data-send-status="sending"]')).toBeNull();
    await waitFor(() => expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue(''));
  });

  it('keeps a draft changed after the failure when the bubble retry succeeds, and never sends the delivered message twice', async () => {
    const onSendMessage = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValue(true);
    render(<Messaging conversations={[conversation]} messages={thread} activeConversationId="c1" currentUserId="me" onSendMessage={onSendMessage} />);
    type('Premier'); submit();
    await screen.findByText('Non envoyé ·');
    type('Premier modifié');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Réessayer l’envoi' })); });
    await waitFor(() => expect(screen.queryByText('Envoi…')).toBeNull());
    expect(screen.getByPlaceholderText(/^Écrire un message/)).toHaveValue('Premier modifié');
    expect(onSendMessage).toHaveBeenCalledTimes(2);
  });
});

describe('Messaging actions menu (MAIR-1163)', () => {
  it('« Créer un groupe avec <personne> » opens the group dialog with the contact preselected', () => {
    const direct = { id: 'c1', name: 'Sophie Leroy', kind: 'direct' as const, contactId: 'user-7' };
    const contacts = [{ id: 'user-7', name: 'Sophie Leroy' }, { id: 'user-8', name: 'Paul Martin' }];
    const onCreateGroupClick = vi.fn();
    render(<Messaging conversations={[direct]} contacts={contacts} activeConversationId="c1" onCreateGroup={vi.fn()} onCreateGroupClick={onCreateGroupClick} />);
    fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Créer un groupe avec Sophie Leroy' }));
    expect(screen.getByRole('dialog', { name: 'Créer un groupe' })).toBeInTheDocument();
    expect(onCreateGroupClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox', { name: /Sophie Leroy/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Paul Martin/ })).not.toBeChecked();
  });

  it('« Marquer comme lus » acknowledges up to the last message so that the counters reach zero', async () => {
    const group = { id: 'g1', name: 'Conseil', kind: 'group' as const, unreadCount: 2 };
    const thread = [
      { id: 'a', conversationId: 'g1', content: 'Un', authorId: 'u2' },
      { id: 'b', conversationId: 'g1', content: 'Deux', authorId: 'u2' },
    ];
    const onReadVisibleMessages = vi.fn(() => true);
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="me" onReadVisibleMessages={onReadVisibleMessages} />);
    fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Marquer comme lus' }));
    await waitFor(() => expect(onReadVisibleMessages).toHaveBeenCalledWith(group, expect.objectContaining({ id: 'b' })));
  });
});

describe('Messaging conversation search (MAIR-1164)', () => {
  const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
  const direct = { id: 'd1', name: 'Sophie Leroy', kind: 'direct' as const, contactId: 'user-7' };
  const thread = [
    { id: 'm1', conversationId: 'g1', content: 'Permis signé', authorId: 'u2' },
    { id: 'm2', conversationId: 'g1', content: 'Merci', authorId: 'u2' },
  ];
  const results = {
    messages: { type: 'messages' as const, items: [{ messageId: 'm1', createdAt: '2026-06-23T12:32:00Z', excerpt: 'Permis signé', highlights: [{ start: 0, length: 6 }] }], hasMore: false, total: 1 },
    files: { type: 'files' as const, items: [], hasMore: false, total: 0 },
    people: { type: 'people' as const, items: [{ id: 'user-7', name: 'Sophie Leroy' }], hasMore: false, total: 1 },
  };

  it('opens the search panel from the header, then scrolls to and highlights the chosen message', async () => {
    const onSearch = vi.fn((_conversation, request) => Promise.resolve(results[request.type as keyof typeof results]));
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<Messaging conversations={[group, direct]} messages={thread} activeConversationId="g1" onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher dans la conversation' }));
    const dialog = screen.getByRole('dialog', { name: 'Rechercher dans la conversation' });
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: 'permis' } });
    const result = await screen.findByText('Permis', { selector: 'mark' });
    expect(onSearch).toHaveBeenCalledWith(group, expect.objectContaining({ query: 'permis', type: 'messages' }));
    fireEvent.click(result);
    expect(screen.queryByRole('dialog', { name: 'Rechercher dans la conversation' })).toBeNull();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(document.querySelector('[data-messaging-message-id="m1"]')).toHaveAttribute('data-revealed');
  });

  it('« Écrire » opens the direct conversation with the person, else « Nouveau message » to them', async () => {
    const onSearch = vi.fn((_conversation, request) => Promise.resolve(results[request.type as keyof typeof results]));
    const onConversationSelect = vi.fn();
    const { rerender } = render(<Messaging conversations={[group, direct]} messages={thread} activeConversationId="g1" onSearch={onSearch} onConversationSelect={onConversationSelect} />);
    const search = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Rechercher dans la conversation' }));
      fireEvent.change(within(screen.getByRole('dialog', { name: 'Rechercher dans la conversation' })).getByRole('searchbox'), { target: { value: 'sophie' } });
      fireEvent.click(await screen.findByRole('tab', { name: /Personnes/ }));
      fireEvent.click(await screen.findByRole('button', { name: 'Écrire à Sophie Leroy' }));
    };
    await search();
    expect(onConversationSelect).toHaveBeenCalledWith(direct);
    rerender(<Messaging conversations={[group]} contacts={[{ id: 'user-7', name: 'Sophie Leroy' }]} messages={thread} activeConversationId="g1" onSearch={onSearch} onNewMessageSend={vi.fn()} />);
    await search();
    expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toBeInTheDocument();
  });
});

describe('Messaging group members (MAIR-1165)', () => {
  it('opens « Membres du groupe » from the avatar pile, keeps the header in step and renders the system notes', async () => {
    const group = { id: 'g1', name: 'Conseil', kind: 'group' as const, memberCount: 2 };
    const members = { canManage: true, members: [{ id: 'user-2', name: 'Moi Agent', isAdmin: true }, { id: 'user-3', name: 'Sophie Leroy', isAdmin: false }] };
    const onLoadMembers = vi.fn(() => Promise.resolve(members));
    const onRemoveMember = vi.fn(() => Promise.resolve({ ...members, members: members.members.slice(0, 1) }));
    const note = { id: 'n1', conversationId: 'g1', content: '', kind: 'system' as const, authorId: 'user-2',
      systemEvent: { action: 'member_removed' as const, actorId: 'user-2', userIds: ['user-3'], userNames: ['Sophie Leroy'] } };
    render(<Messaging conversations={[group]} messages={[note]} activeConversationId="g1" currentUserId="user-2"
      onLoadMembers={onLoadMembers} onRemoveMember={onRemoveMember} onLeaveConversation={vi.fn(() => Promise.resolve(true))} />);
    expect(screen.getByText('Vous avez retiré Sophie Leroy du groupe.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2 membres, gérer les membres' }));
    expect(await screen.findByText('Sophie Leroy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Sophie Leroy du groupe' }));
    await waitFor(() => expect(onRemoveMember).toHaveBeenCalledWith(group, members.members[1]));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retirer Sophie Leroy du groupe' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le panneau' }));
    fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gérer les membres' }));
    expect(screen.getByRole('dialog', { name: 'Membres du groupe' })).toBeInTheDocument();
  });
});

describe('Messaging mentions and links (MAIR-1166)', () => {
  it('suggests from the BFF, moves with the arrows, chooses with Entrée, freezes the tag and sends on Entrée when closed', async () => {
    const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
    const onSuggestMentions = vi.fn(() => Promise.resolve({ everyone: true, groups: [{ id: 'group-4', name: 'Urbanisme' }], people: [{ id: 'user-3', name: 'Sophie Leroy' }] }));
    const onSuggestLinks = vi.fn(() => Promise.resolve([{ id: 'event-5', title: 'Conseil du 12', kind: 'event' as const, description: 'Événement' }]));
    const onSendMessage = vi.fn(() => true);
    render(<Messaging conversations={[group]} activeConversationId="g1" onSendMessage={onSendMessage} onSuggestMentions={onSuggestMentions} onSuggestLinks={onSuggestLinks} />);
    const input = screen.getByRole('combobox', { name: 'Écrire un message' });
    fireEvent.change(input, { target: { value: 'Bonjour @' } });
    expect(await screen.findByRole('option', { name: /@tout le monde/ })).toHaveAttribute('aria-selected', 'true');
    expect(onSuggestMentions).toHaveBeenCalledWith(group, '', expect.any(AbortSignal));
    expect(input).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /@Sophie Leroy/ }).id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Bonjour @Sophie Leroy ');
    fireEvent.change(input, { target: { value: 'Bonjour @Sophie Leroy voir #con' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.change(input, { target: { value: 'Bonjour @Sophie Leroy voir #cons' } });
    fireEvent.click(await screen.findByRole('option', { name: /#Conseil du 12/ }));
    expect(input).toHaveValue('Bonjour @Sophie Leroy voir #Conseil du 12 ');
    fireEvent.submit(input.closest('form')!);
    expect(onSendMessage).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Bonjour @Sophie Leroy voir #Conseil du 12',
      mentions: [expect.objectContaining({ id: 'user-3', target: 'person' })],
      businessLinks: [expect.objectContaining({ id: 'event-5' })],
    }));
  });
});

describe('Messaging reply (MAIR-1167)', () => {
  const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
  const thread = [
    { id: 'm1', conversationId: 'g1', content: 'Le permis est signé', authorId: 'u3', authorName: 'Sophie Leroy' },
    { id: 'm2', conversationId: 'g1', content: 'Bravo', authorId: 'me', citation: 'm1', quoted: { id: 'm1', authorName: 'Sophie Leroy', excerpt: 'Le permis est signé' } },
    { id: 'm3', conversationId: 'g1', content: 'Supprimé ?', authorId: 'u3', citation: 'm4', quoted: { id: 'm4', excerpt: '' } },
    { id: 'm4', conversationId: 'g1', content: '', authorId: 'u3', deleted: true },
  ];

  it('answers a message from its toolbar, sends `replyTo` and clears the reply bar once sent', async () => {
    const onSendMessage = vi.fn(() => Promise.resolve(true));
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="me" onSendMessage={onSendMessage} />);
    const bubble = document.querySelector('[data-messaging-message-id="m1"] [data-direction]') as HTMLElement;
    expect(bubble).toHaveAttribute('tabindex', '0');
    fireEvent.click(actionsOf('m1').getByRole('button', { name: 'Répondre' }));
    expect(screen.getByText('Réponse à Sophie Leroy')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Écrire un message' })).toHaveFocus());
    fireEvent.change(screen.getByRole('combobox', { name: 'Écrire un message' }), { target: { value: 'Merci !' } });
    fireEvent.submit(screen.getByRole('combobox', { name: 'Écrire un message' }).closest('form')!);
    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith(expect.objectContaining({ content: 'Merci !', replyTo: 'm1' })));
    await waitFor(() => expect(screen.queryByText('Réponse à Sophie Leroy')).toBeNull());
  });

  it('shows the quote above the reply, scrolls to the original, and « Message supprimé » for a deleted one', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="me" onSendMessage={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Voir le message cité de Sophie Leroy' }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(document.querySelector('[data-messaging-message-id="m1"]')).toHaveAttribute('data-revealed');
    expect(within(document.querySelector('[data-messaging-message-id="m3"]') as HTMLElement).getByText('Message supprimé')).toBeVisible();
  });

  it('cancels a reply and opens the toolbar with a long press on a touch screen', () => {
    vi.useFakeTimers();
    try {
      render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="me" onSendMessage={vi.fn()} />);
      const row = document.querySelector('[data-messaging-message-id="m1"]') as HTMLElement;
      fireEvent.pointerDown(row, { pointerType: 'touch' });
      act(() => { vi.advanceTimersByTime(600); });
      expect(within(row).getByRole('toolbar')).toHaveAttribute('data-open', 'true');
      fireEvent.click(within(row).getByRole('button', { name: 'Répondre' }));
      fireEvent.click(screen.getByRole('button', { name: 'Annuler la réponse' }));
      expect(screen.queryByText('Réponse à Sophie Leroy')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

/** Hovers a message, which mounts its actions toolbar (MAIR-1169: not rendered before), and scopes queries to it. */
const actionsOf = (id: string) => {
  const row = document.querySelector(`[data-messaging-message-id="${id}"]`) as HTMLElement;
  fireEvent.pointerOver(row);
  return within(row);
};

describe('Messaging actions toolbar (MAIR-1169)', () => {
  it('mounts the toolbar of a message only from the first hover or keyboard focus, then keeps it', () => {
    const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
    const thread = [
      { id: 'm1', conversationId: 'g1', content: 'Un', authorId: 'u2' },
      { id: 'm2', conversationId: 'g1', content: 'Deux', authorId: 'me' },
    ];
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="me" onSendMessage={vi.fn()} onEditMessage={vi.fn()} />);
    const row = (id: string) => document.querySelector(`[data-messaging-message-id="${id}"]`) as HTMLElement;
    expect(screen.queryAllByRole('toolbar', { name: 'Actions du message' })).toHaveLength(0);
    fireEvent.pointerOver(row('m1'));
    expect(within(row('m1')).getByRole('button', { name: 'Répondre' })).toBeInTheDocument();
    fireEvent.pointerOut(row('m1'));
    expect(within(row('m1')).getByRole('toolbar')).toBeInTheDocument();
    fireEvent.focus(row('m2').querySelector('[tabindex="0"]') as HTMLElement);
    expect(within(row('m2')).getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
  });
});

describe('Messaging edit (MAIR-1168)', () => {
  it('edits one of my messages in place, then shows « · modifié » after its time', async () => {
    const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
    const mine = { id: 'm1', conversationId: 'g1', content: 'Réunion à 14h', authorId: 'me', sentAt: '10:02' };
    const onEditMessage = vi.fn(() => Promise.resolve(true));
    const { rerender } = render(<Messaging conversations={[group]} messages={[mine, { id: 'm2', conversationId: 'g1', content: 'Ok', authorId: 'u3' }]} activeConversationId="g1" currentUserId="me" onEditMessage={onEditMessage} />);
    expect(actionsOf('m2').queryByRole('button', { name: 'Modifier' })).toBeNull();
    fireEvent.click(actionsOf('m1').getByRole('button', { name: 'Modifier' }));
    const field = screen.getByRole('textbox', { name: 'Modifier le message' });
    fireEvent.change(field, { target: { value: 'Réunion à 15h' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Modifier le message' })).toBeNull());
    expect(onEditMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), { content: 'Réunion à 15h', mentions: [], businessLinks: [] });
    rerender(<Messaging conversations={[group]} messages={[{ ...mine, content: 'Réunion à 15h', editedAt: '2026-06-23T12:40:00Z' }]} activeConversationId="g1" currentUserId="me" onEditMessage={onEditMessage} />);
    expect(screen.getByText(/10:02 · modifié/)).toBeInTheDocument();
  });
});

describe('Messaging delete (MAIR-1169)', () => {
  const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
  const mine = { id: 'm1', conversationId: 'g1', content: 'Erreur de fil', authorId: 'me' };

  it('confirms the deletion, shows the danger alert on a failure, and leaves no action on a tombstone', async () => {
    const onDeleteMessage = vi.fn().mockRejectedValueOnce(new Error('Le message n’a pas pu être supprimé.')).mockResolvedValue(true);
    const { rerender } = render(<Messaging conversations={[group]} messages={[mine]} activeConversationId="g1" currentUserId="me" onDeleteMessage={onDeleteMessage} />);
    const row = () => document.querySelector('[data-messaging-message-id="m1"]') as HTMLElement;
    fireEvent.click(actionsOf('m1').getByRole('button', { name: 'Supprimer' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer le message ?' });
    expect(dialog).toHaveTextContent('Le message sera remplacé par « Message supprimé » pour tous les participants.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    expect(await screen.findByText('Le message n’a pas pu être supprimé.')).toBeVisible();
    expect(within(row()).getByText('Erreur de fil')).toBeVisible();
    fireEvent.click(actionsOf('m1').getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(onDeleteMessage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Le message n’a pas pu être supprimé.')).toBeNull());
    rerender(<Messaging conversations={[group]} messages={[{ ...mine, content: '', deleted: true }]} activeConversationId="g1" currentUserId="me" onDeleteMessage={onDeleteMessage} />);
    expect(within(row()).getByText('Message supprimé')).toBeVisible();
    expect(within(row()).queryByRole('toolbar')).toBeNull();
    expect(within(row()).queryByText('Envoyé')).toBeNull();
  });

  it('cancels the deletion', () => {
    const onDeleteMessage = vi.fn();
    render(<Messaging conversations={[group]} messages={[mine]} activeConversationId="g1" currentUserId="me" onDeleteMessage={onDeleteMessage} />);
    fireEvent.click(actionsOf('m1').getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onDeleteMessage).not.toHaveBeenCalled();
  });
});

describe('Messaging reactions (MAIR-1170)', () => {
  const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
  const message = { id: 'm1', conversationId: 'g1', content: 'Budget voté', authorId: 'u3',
    reactions: [{ emoji: '👍', count: 2, reactedByMe: true, userNames: ['Moi', 'Paul'] }] };

  it('reacts from the toolbar, toggles my reaction from its pill and shows a refusal above the thread', async () => {
    const onToggleReaction = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('La réaction n’a pas pu être enregistrée.'));
    render(<Messaging conversations={[group]} messages={[message]} activeConversationId="g1" currentUserId="me" onToggleReaction={onToggleReaction} />);
    const row = document.querySelector('[data-messaging-message-id="m1"]') as HTMLElement;
    fireEvent.click(actionsOf('m1').getByRole('button', { name: 'Réagir' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Réagir avec cœur' }));
    await waitFor(() => expect(onToggleReaction).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), '❤️', true));
    expect(within(row).queryByRole('group', { name: 'Choisir une réaction' })).toBeNull();
    await waitFor(() => expect(within(row).getByRole('button', { name: '👍 2, dont vous' })).toBeEnabled());
    fireEvent.click(within(row).getByRole('button', { name: '👍 2, dont vous' }));
    await waitFor(() => expect(onToggleReaction).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'm1' }), '👍', false));
    await waitFor(() => expect(within(row).getByRole('button', { name: 'Ajouter une réaction' })).toBeEnabled());
    fireEvent.click(within(row).getByRole('button', { name: 'Ajouter une réaction' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Réagir avec pouce levé' }));
    expect(await screen.findByText('La réaction n’a pas pu être enregistrée.')).toBeVisible();
    expect(onToggleReaction).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'm1' }), '👍', false);
  });

  it('MAIR-1181 arriving with a project opens « Nouveau message » about it and sends the project with the message', () => {
    const context = { id: 'project-7', kind: 'project' as const, title: 'Médiathèque', href: 'https://projects.test/?project=7' };
    const handleNewMessageSend = vi.fn();
    const onContextRemove = vi.fn();
    const { rerender } = render(<DemoMessaging contextReference={context} onContextRemove={onContextRemove} onNewMessageSend={handleNewMessageSend} />);
    expect(screen.queryByRole('dialog', { name: 'Nouveau message' })).not.toBeInTheDocument();

    rerender(<DemoMessaging contextReference={context} onContextRemove={onContextRemove} onNewMessageSend={handleNewMessageSend} newMessageRequest={1} />);
    const dialog = screen.getByRole('dialog', { name: 'Nouveau message' });
    expect(dialog).toHaveTextContent('Message lié au projet « Médiathèque »');
    fireEvent.change(screen.getByLabelText('Destinataire'), { target: { value: 'pierre-martin' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Bonjour Pierre' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Envoyer' }));
    expect(handleNewMessageSend).toHaveBeenCalledWith({ recipientId: 'pierre-martin', message: 'Bonjour Pierre', context });

    fireEvent.click(screen.getByRole('button', { name: 'Retirer le contexte' }));
    expect(onContextRemove).toHaveBeenCalledTimes(1);
  });

  it('MAIR-1181 without a context « Nouveau message » keeps its subtitle and sends no context', () => {
    const handleNewMessageSend = vi.fn();
    render(<DemoMessaging onNewMessageSend={handleNewMessageSend} newMessageRequest={0} />);
    expect(screen.queryByRole('dialog', { name: 'Nouveau message' })).not.toBeInTheDocument();
    openFromNewConversationMenu('Nouveau message');
    expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toHaveTextContent('Envoyer un message direct à un contact');
  });

  describe('MAIR-1182 a @person tag of a message opens the card of that person', () => {
    const group = { id: 'g1', name: 'Urbanisme', kind: 'group' as const };
    const sophie = { id: 'user-7', name: 'Sophie Leroy', kind: 'direct' as const, department: 'Finances', presence: 'away' as const };
    const marc = { id: 'user-8', name: 'Marc Petit', kind: 'direct' as const };
    const direct = { id: 'd7', name: 'Sophie Leroy', kind: 'direct' as const, contactId: 'user-7' };
    const thread = presentMessageAuthors([{
      id: 'm1', conversationId: 'g1', authorId: 'user-8', authorName: 'Marc Petit', direction: 'incoming',
      content: 'Voir avec @Sophie Leroy et @Marc Petit, ou @Claire Martin',
      mentions: [{ id: 'user-2', name: 'Claire Martin' }],
    }], 'user-2', [{ id: 'user-7', name: 'Sophie Leroy', kind: 'direct' }, { id: 'user-8', name: 'Marc Petit', kind: 'direct' }], []);

    it('« Écrire » of the card opens the direct conversation with the person', () => {
      const onConversationSelect = vi.fn();
      render(<Messaging conversations={[group, direct]} contacts={[sophie, marc]} messages={thread} activeConversationId="g1" currentUserId="user-2" onConversationSelect={onConversationSelect} />);
      fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la fiche de Sophie Leroy' }));
      const card = screen.getByRole('dialog');
      expect(card).toHaveTextContent('Sophie Leroy');
      expect(card).toHaveTextContent('Finances · Absent');
      fireEvent.click(within(card).getByRole('button', { name: 'Écrire à Sophie Leroy' }));
      expect(onConversationSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'd7' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('without a direct conversation, « Écrire » opens « Nouveau message » to the person', () => {
      render(<Messaging conversations={[group, direct]} contacts={[sophie, marc]} messages={thread} activeConversationId="g1" currentUserId="user-2" onNewMessageSend={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la fiche de Marc Petit' }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Écrire à Marc Petit' }));
      expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toBeInTheDocument();
    });

    it('the card of the agent themself has no « Écrire », and « Fermer » closes it', () => {
      render(<Messaging conversations={[group, direct]} contacts={[sophie, marc]} messages={thread} activeConversationId="g1" currentUserId="user-2" onNewMessageSend={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la fiche de Claire Martin' }));
      const card = screen.getByRole('dialog');
      expect(card).toHaveTextContent('Claire Martin (vous)');
      expect(within(card).queryByRole('button', { name: /Écrire/ })).not.toBeInTheDocument();
      fireEvent.click(within(card).getByRole('button', { name: 'Fermer' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ouvrir la fiche de Sophie Leroy' })).toBeInTheDocument();
    });
  });
});

describe('Messaging global search target (MAIR-1230)', () => {
  const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
  const thread = [
    { id: 'm1', conversationId: 'g1', content: 'Le permis est signé', authorId: 'u3', authorName: 'Sophie Leroy' },
    { id: 'm2', conversationId: 'g1', content: 'Bravo', authorId: 'me' },
  ];

  it('MAIR-1230 scrolls to and highlights the message a search link points at, then reports it found', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const onMessageRevealed = vi.fn();
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="me" revealMessageId="m1" onMessageRevealed={onMessageRevealed} />);
    await waitFor(() => expect(onMessageRevealed).toHaveBeenCalledWith(true));
    expect(onMessageRevealed).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(document.querySelector('[data-messaging-message-id="m1"]')).toHaveAttribute('data-revealed');
    expect(document.querySelector('[data-messaging-message-id="m2"]')).not.toHaveAttribute('data-revealed');
  });

  it('MAIR-1230 reveals the message even without onMessageRevealed', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="me" revealMessageId="m1" />);
    await waitFor(() => expect(document.querySelector('[data-messaging-message-id="m1"]')).toHaveAttribute('data-revealed'));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('MAIR-1230 a message outside the loaded page leaves the conversation open and reports it not found, once', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const onMessageRevealed = vi.fn();
    const { rerender } = render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" revealMessageId="m-unknown" onMessageRevealed={onMessageRevealed} />);
    await waitFor(() => expect(onMessageRevealed).toHaveBeenCalledWith(false));
    rerender(<Messaging conversations={[group]} messages={[...thread]} activeConversationId="g1" revealMessageId="m-unknown" onMessageRevealed={onMessageRevealed} />);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(onMessageRevealed).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByText('Le permis est signé')).toBeVisible();
    expect(document.querySelector('[data-revealed]')).toBeNull();
  });
});

describe('Messaging group header before the members are read (MAIR-1253)', () => {
  const message = (id: string, authorId: string, authorName: string) => ({ id, conversationId: 'g1', content: 'Bonjour', authorId, authorName, sentAt: '10:00' });
  const thread = [message('m1', 'user-3', 'Sophie Leroy'), message('m2', 'user-9', 'Ancien Membre')];

  it('shows only the authors who are still members, with the size of the group', () => {
    const group = { id: 'g1', name: 'Conseil', kind: 'group' as const, memberIds: ['user-2', 'user-3', 'user-4'] };
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="user-2" onLoadMembers={vi.fn(() => new Promise<MessagingMembers>(() => {}))} />);
    const pile = screen.getByRole('button', { name: '3 membres, gérer les membres' });
    expect(pile.textContent).toContain('SL');
    expect(pile.textContent).not.toContain('AM');
  });

  it('shows no member pile when neither the size nor the members of the group are known', () => {
    const group = { id: 'g1', name: 'Conseil', kind: 'group' as const };
    render(<Messaging conversations={[group]} messages={thread} activeConversationId="g1" currentUserId="user-2" onLoadMembers={vi.fn(() => new Promise<MessagingMembers>(() => {}))} />);
    expect(screen.queryByRole('button', { name: /membres, gérer les membres/ })).toBeNull();
  });
});
