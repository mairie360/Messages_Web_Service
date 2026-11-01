import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { CreateGroupModal } from './components/CreateGroupModal';
import { Messaging } from './Messaging';
import { MessagingComposer } from './components/ConversationComposers/components/MessagingComposer';
import { MessagingConversationItem } from './components/MessagingSidebar/components/ConversationList/components/MessagingConversationItem';
import { MessagingSidebar } from './components/MessagingSidebar';
import { NewMessageModal } from './components/NewMessageModal';
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

describe('Messaging components', () => {
  it('renders no demo content or unsupported actions by default', () => {
    render(<Messaging />);

    expect(screen.getByRole('heading', { name: 'Messagerie' })).toBeInTheDocument();
    expect(screen.getByText('Aucune conversation trouvée.')).toBeInTheDocument();
    expect(screen.getByText('Sélectionnez une conversation pour commencer.')).toBeInTheDocument();
    expect(screen.queryByText('Marie Dubois')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nouveau message' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer un groupe' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tapez votre message...')).toBeDisabled();
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

  it('shows a full conversation name above the timestamp without losing metadata or selection', () => {
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
    expect(nameElement).toHaveClass('break-words');
    expect(nameElement).not.toHaveClass('truncate');
    expect(nameElement.parentElement?.parentElement).toHaveClass('flex-col');
    expect(item).toHaveTextContent('27/09 14:42');
    expect(item).toHaveTextContent('Services techniques');
    expect(item).toHaveTextContent('Réunion confirmée');
    expect(item).toHaveTextContent('3');
    item.focus();
    expect(item).toHaveFocus();
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('filters conversations from the sidebar search', () => {
    render(<DemoMessaging />);

    fireEvent.change(screen.getByPlaceholderText('Rechercher un contact...'), {
      target: { value: 'Sophie' },
    });

    expect(screen.getAllByText('Sophie Leroy')[0]).toBeInTheDocument();
    expect(screen.queryByText('Pierre Martin')).not.toBeInTheDocument();
  });

  it('switches the visible conversation when the consumer has not fixed the active id', () => {
    const handleConversationSelect = vi.fn();
    render(<DemoMessaging onConversationSelect={handleConversationSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Pierre Martin\s*Urbanisme/ }));

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

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), {
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

  it('surfaces messaging notifications from unread conversations', () => {
    render(<DemoMessaging />);

    expect(screen.getByRole('status', { name: 'Notifications de messagerie' })).toHaveTextContent(
      '6 notifications non lues'
    );
  });

  it('opens the correct modal from each sidebar icon', () => {
    render(<DemoMessaging />);

    fireEvent.click(screen.getByLabelText('Nouveau message'));
    expect(screen.getByRole('dialog', { name: 'Nouveau message' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fermer'));

    fireEvent.click(screen.getByLabelText('Créer un groupe'));
    expect(screen.getByRole('dialog', { name: 'Créer un groupe' })).toBeInTheDocument();
  });

  it('delegates direct-message creation and closes the modal after submission', () => {
    const handleNewMessageSend = vi.fn();
    render(<DemoMessaging onNewMessageSend={handleNewMessageSend} />);

    fireEvent.click(screen.getByLabelText('Nouveau message'));
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

    fireEvent.click(screen.getByLabelText('Nouveau message'));
    expect(screen.getByRole('option', { name: 'Alice Martin - Urbanisme' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fermer'));

    fireEvent.click(screen.getByLabelText('Créer un groupe'));
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
    fireEvent.click(screen.getByText('Supprimer la conversation'));

    expect(handleDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'marie-dubois' }));
    expect(screen.getByText('Bonjour Jean, j\'ai examiné le dossier du projet de rénovation.')).toBeInTheDocument();
    expect(screen.getAllByText('Pierre Martin')[0]).toBeInTheDocument();
  });

  it('only exposes supplied call callbacks and dismisses the actions menu on outside click', () => {
    const handleCall = vi.fn();
    const handleVideoCall = vi.fn();
    const handleMoreActions = vi.fn();
    render(
      <DemoMessaging
        onCall={handleCall}
        onVideoCall={handleVideoCall}
        onMoreActions={handleMoreActions}
        onConversationDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Appeler' }));
    fireEvent.click(screen.getByRole('button', { name: 'Appel vidéo' }));
    expect(handleCall).toHaveBeenCalledWith(expect.objectContaining({ id: 'marie-dubois' }));
    expect(handleVideoCall).toHaveBeenCalledWith(expect.objectContaining({ id: 'marie-dubois' }));

    fireEvent.click(screen.getByRole('button', { name: "Plus d'actions" }));
    expect(handleMoreActions).toHaveBeenCalledWith(expect.objectContaining({ id: 'marie-dubois' }));
    expect(screen.getByRole('button', { name: 'Supprimer la conversation' })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: 'Supprimer la conversation' })).not.toBeInTheDocument();
  });

  it('delegates sending without fabricating a persisted message', () => {
    const handleSendMessage = vi.fn();
    render(<Messaging conversations={[defaultMessagingConversations[0]]} onSendMessage={handleSendMessage} />);

    expect(screen.queryByRole('button', { name: 'Appeler' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Appel vidéo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Plus d'actions" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), {
      target: { value: 'Message en attente du serveur' },
    });
    fireEvent.click(screen.getByLabelText('Envoyer'));

    expect(handleSendMessage).toHaveBeenCalledWith({
      conversationId: 'marie-dubois',
      content: 'Message en attente du serveur',
    });
    expect(screen.queryByText('Message en attente du serveur')).not.toBeInTheDocument();
    expect(screen.getByText('Aucun message dans cette conversation.')).toBeInTheDocument();
  });

  it('delegates group creation without inventing a local conversation', () => {
    const handleCreateGroup = vi.fn();
    render(<Messaging conversations={[defaultMessagingConversations[0]]} onCreateGroup={handleCreateGroup} />);

    fireEvent.click(screen.getByRole('button', { name: 'Créer un groupe' }));
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
    expect(screen.queryByRole('button', { name: 'Projet test' })).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Projet test' }));
    fireEvent.click(screen.getByRole('link', { name: 'Conseil municipal' }));
    expect(handleBusinessReferenceClick).toHaveBeenNthCalledWith(1, project);
    expect(handleBusinessReferenceClick).toHaveBeenNthCalledWith(2, event);
    expect(screen.getByRole('link', { name: 'rapport.pdf' })).toHaveAttribute('href', '/files/1');
  });

  it('adds a system emoji to the composer', () => {
    render(<DemoMessaging />);

    fireEvent.click(screen.getByLabelText('Ajouter une réaction'));
    fireEvent.click(screen.getByLabelText('Ajouter 👍'));

    expect(screen.getByPlaceholderText('Tapez votre message...')).toHaveValue('👍');
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
    const input = screen.getByPlaceholderText('Tapez votre message...');
    fireEvent.change(input, { target: { value: '@Mar' } });
    fireEvent.click(screen.getByRole('button', { name: /@Marie/ }));
    fireEvent.change(input, { target: { value: '@Marie #Projet' } });
    fireEvent.click(screen.getByRole('button', { name: /#Projet mairie/ }));
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
    const input = screen.getByPlaceholderText('Tapez votre message...');
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

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), {
      target: { value: '@Éq' },
    });
    fireEvent.click(screen.getByText('@Équipe Direction'));
    expect(screen.getByPlaceholderText('Tapez votre message...')).toHaveValue('@Équipe Direction ');

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

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), {
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

    fireEvent.click(screen.getByLabelText('Mentionner un utilisateur'));
    expect(screen.getByPlaceholderText('Tapez votre message...')).toHaveValue('@');

    fireEvent.click(screen.getByText('@Marie Dubois'));
    expect(screen.getByPlaceholderText('Tapez votre message...')).toHaveValue('@Marie Dubois ');
  });

  it('mentions a business element with # and sends the linked reference metadata', () => {
    const handleSendMessage = vi.fn();
    render(<DemoMessaging onSendMessage={handleSendMessage} />);

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), {
      target: { value: '#Projet' },
    });
    fireEvent.click(screen.getByText('#Projet rénovation mairie'));
    expect(screen.getByPlaceholderText('Tapez votre message...')).toHaveValue('#Projet rénovation mairie ');

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

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), { target: { value: '#' } });
    expect(screen.getByRole('button', { name: /#Conseil municipal/ })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), {
      target: { value: '#conseil muni' },
    });
    const eventSuggestion = screen.getByRole('button', { name: /#Conseil municipal/ });
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

    fireEvent.change(screen.getByPlaceholderText('Tapez votre message...'), {
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
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau message' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Créer un groupe' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    expect(screen.getByLabelText('Nom du groupe')).toHaveValue('');
    expect(screen.getByLabelText('Description (optionnel)')).toHaveValue('');
    expect(screen.getByLabelText('Marie Dubois - Finances')).not.toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps a pending group open, freezes values and prevents duplicate submissions', async () => {
    let resolveCreation!: (confirmed: boolean) => void;
    const onCreateGroup = vi.fn(() => new Promise<boolean>((resolve) => { resolveCreation = resolve; }));
    render(<DemoMessaging onCreateGroup={onCreateGroup} />);
    fireEvent.click(screen.getByRole('button', { name: 'Créer un groupe' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Créer un groupe' }));
    fireEvent.change(screen.getByLabelText('Nom du groupe'), { target: { value: 'Groupe confirmé' } });
    fireEvent.click(screen.getByLabelText('Marie Dubois - Finances'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le groupe' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onCreateGroup).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Groupe confirmé')).not.toBeInTheDocument();
  });
});
