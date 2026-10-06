-- Data of the states of rgaa.yaml, played by the seeder-a11y service of
-- docker-compose-accessibility.yml after init-test.sql (users 2 and 3). The ZAP / k6 stacks do
-- not load it. Fixed dates: the engine fixes the browser clock at 2026-01-15T09:00:00+01:00.
--
-- Schema: liquibase-migrations 1.3.0 (Database v1.3.0, releases/v1.0.0/12__init_messaging.sql and
-- releases/v1.2.0/07__messaging.sql). message-api 0.7.1 lists the conversations of a user through
-- conversation_members (newest created_at first), its messages from messages, and the unread
-- counts from unread_counters, which the messages insert trigger fills for the other members.

BEGIN;

-- One transaction: the deferred trigger tr_users_default_role_guest then sees the User role and
-- does not add Guest. Every user needs a user_roles row (core-api answers 502 otherwise).
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES
  -- Third member of the group conversation of user 2.
  (10, 'Camille', 'Martin', 'camille-martin@mairie360.fr', 'dummy', 'active'),
  -- Only for message-sent, which posts a message: the states run in parallel, the ones played as
  -- user 2 must not see it. It has a conversation of its own.
  (11, 'Rgaa', 'Writer', 'rgaa-writer@mairie360.fr', 'dummy', 'active'),
  -- Only for empty-inbox: no conversation at all.
  (12, 'Rgaa', 'Empty', 'rgaa-empty@mairie360.fr', 'dummy', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM roles r CROSS JOIN (VALUES (10), (11), (12)) AS u(id)
WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;

COMMIT;

-- Explicit ids, then the sequence is moved past them so that the conversations created by the
-- application never collide. Messages keep their generated ids.
INSERT INTO conversations (id, title, kind, created_at)
VALUES
  -- Direct conversation of user 2 with user 3 (older: second in the list).
  (101, 'Planning de la semaine', 'direct', '2026-01-12T08:00:00Z'),
  -- Group conversation of users 2, 3 and 10 (newest: first in the list, selected on load).
  (102, 'Équipe accueil', 'group', '2026-01-13T09:00:00Z'),
  -- Conversation of the writer (user 11) with user 3, invisible to user 2.
  (103, 'Courrier entrant', 'direct', '2026-01-10T10:00:00Z')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('conversations', 'id'), 1000);

INSERT INTO conversation_members (conversation_id, user_id, joined_at)
VALUES
  (101, 2, '2026-01-12T08:00:00Z'),
  (101, 3, '2026-01-12T08:00:00Z'),
  (102, 2, '2026-01-13T09:00:00Z'),
  (102, 3, '2026-01-13T09:00:00Z'),
  (102, 10, '2026-01-13T09:00:00Z'),
  (103, 11, '2026-01-10T10:00:00Z'),
  (103, 3, '2026-01-10T10:00:00Z')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Incoming and outgoing messages for user 2; the ones of users 3 and 10 leave unread counts
-- (trigger), so the notification banner shows too.
INSERT INTO messages (conversation_id, owner_id, content, created_at)
VALUES
  (101, 3, 'Bonjour, pouvez-vous me transmettre le planning de la semaine ?', '2026-01-12T08:05:00Z'),
  (101, 2, 'Oui, je vous l''envoie dans la matinée.', '2026-01-12T08:20:00Z'),
  (102, 10, 'Bonjour à tous, la réunion d''équipe est avancée à 14 h.', '2026-01-14T08:30:00Z'),
  (102, 3, 'Merci, je préviens le service état civil.', '2026-01-14T08:45:00Z'),
  (102, 2, 'Bien noté, à tout à l''heure.', '2026-01-14T09:10:00Z'),
  (103, 3, 'Le courrier du jour est arrivé.', '2026-01-14T07:30:00Z');
