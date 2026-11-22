import React from 'react';
import { Button, ConfirmModal, DataState, Drawer, ErrorAlert, Text } from '@mairie360/lib-components/primitives';

import { AddMembersView } from './components/AddMembersView';
import { MemberRow } from './components/MemberRow';
import type {
  MessagingContactId,
  MessagingConversation,
  MessagingMember,
  MessagingMembers,
} from '../../messaging-types';

export interface GroupMembersPanelProps {
  open: boolean;
  conversation: MessagingConversation | null;
  /** `null` while the members are loading. */
  members: MessagingMembers | null;
  loadError?: string | null;
  currentUserId?: MessagingContactId;
  /** The directory, from which agents are added. */
  contacts: MessagingConversation[];
  onClose: () => void;
  onRetry?: () => void;
  /** Each action answers whether it was confirmed; a refusal (`false` or a rejection) keeps the panel and its input. */
  onAdd?: (userIds: MessagingContactId[]) => Promise<boolean | void>;
  onRemove?: (member: MessagingMember) => Promise<boolean | void>;
  onLeave?: () => Promise<boolean | void>;
}

const userKey = (id: MessagingContactId | undefined) => String(id ?? '').replace(/^user-/, '');
const failureMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/**
 * « Membres du groupe » (MAIR-1165, Figma F11): lib `Drawer` with the members (badge Administrateur), « Ajouter des
 * membres » and « Retirer » for the administrators only, and « Quitter le groupe » for everyone (lib `ConfirmModal`).
 * A refused action is shown in a lib `ErrorAlert` inside the panel, the input kept.
 */
export const GroupMembersPanel = ({
  open, conversation, members, loadError, currentUserId, contacts, onClose, onRetry, onAdd, onRemove, onLeave,
}: GroupMembersPanelProps) => {
  const [view, setView] = React.useState<'list' | 'add'>('list');
  const [selectedIds, setSelectedIds] = React.useState<MessagingContactId[]>([]);
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = React.useState(false);

  React.useEffect(() => {
    if (open) return;
    setView('list'); setSelectedIds([]); setError(null); setConfirmLeave(false);
  }, [open]);

  const run = async (key: string, action: () => Promise<boolean | void> | undefined, fallback: string, onDone?: () => void) => {
    if (pending) return;
    setPending(key); setError(null);
    try {
      const confirmed = await action();
      if (confirmed === false) setError(fallback);
      else onDone?.();
    } catch (failure) {
      setError(failureMessage(failure, fallback));
    } finally {
      setPending(null);
    }
  };

  const canManage = members?.canManage === true;
  const memberKeys = new Set((members?.members ?? []).map(member => userKey(member.id)));
  const candidates = contacts.filter(contact => !memberKeys.has(userKey(contact.id)) && userKey(contact.id) !== userKey(currentUserId));

  const body = () => {
    if (loadError) return <DataState state="error" size="s" title={loadError} onRetry={onRetry} />;
    if (!members) return <DataState state="loading" size="s" title="Chargement des membres…" />;
    if (view === 'add') {
      return (
        <AddMembersView
          candidates={candidates}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          pending={pending === 'add'}
          onCancel={() => { setView('list'); setError(null); }}
          onSubmit={() => void run('add', () => onAdd?.(selectedIds), 'Les membres n’ont pas pu être ajoutés.', () => { setSelectedIds([]); setView('list'); })}
        />
      );
    }
    return (
      <>
        {canManage && onAdd && (
          <Button className="mb-2 self-start" variant="outline" size="s" label="Ajouter des membres" onClick={() => { setView('add'); setError(null); }} />
        )}
        <Text as="p" size="xs" tone="muted">{members.members.length === 1 ? '1 membre' : `${members.members.length} membres`}</Text>
        <ul aria-label="Membres du groupe" className="divide-y divide-[var(--mairie-border)]">
          {members.members.map(member => (
            <li key={String(member.id)}>
              <MemberRow
                member={member}
                self={userKey(member.id) === userKey(currentUserId)}
                removing={pending === `remove:${String(member.id)}`}
                onRemove={canManage && onRemove
                  ? target => void run(`remove:${String(target.id)}`, () => onRemove(target), `${target.name} n’a pas pu être retiré du groupe.`)
                  : undefined}
              />
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <>
      <Drawer
        open={open && conversation !== null}
        size="m"
        title="Membres du groupe"
        onClose={onClose}
        footer={onLeave && members ? (
          <Button variant="outline" tone="danger" label="Quitter le groupe" loading={pending === 'leave'} onClick={() => setConfirmLeave(true)} />
        ) : undefined}
      >
        <div className="flex flex-col gap-3">
          {error && <ErrorAlert title={error} />}
          {body()}
        </div>
      </Drawer>
      {onLeave && (
        <ConfirmModal
          open={confirmLeave}
          role="alertdialog"
          title="Quitter le groupe ?"
          message={`Vous ne recevrez plus les messages de « ${conversation?.name ?? 'ce groupe'} ».`}
          confirmLabel="Quitter"
          initialFocus="cancel"
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => { setConfirmLeave(false); void run('leave', onLeave, 'Vous n’avez pas pu quitter le groupe.'); }}
        />
      )}
    </>
  );
};
