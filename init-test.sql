-- Seed minimal pour les tests isolés (performance / sécurité) du front Messages.
-- L'utilisateur 2 est celui référencé par les JWT de test (claim sub = "2") :
--   * load-test.js le signe dynamiquement et l'envoie en cookie accessToken,
--   * docker-compose-security.yml injecte un cookie statique via le replacer ZAP.
-- L'utilisateur 3 existe pour que /contacts (annuaire lu via Core API, qui
-- interroge la même table users, en excluant l'appelant) renvoie au moins une entrée.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES
  (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active'),
  (3, 'Contact', 'Sample', 'contact-sample@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active')
ON CONFLICT (id) DO NOTHING;
-- Rôle de l'utilisateur de test, repris par le shell du front (GET /me de BFF Message).
INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
-- End-to-end journeys (MAIR-603): user 3 receives the direct message of user 2 and signs in to read
-- it, so it needs a role too (Core API answers GET /user/me only for a user with one).
INSERT INTO user_roles (user_id, role_id)
SELECT 3, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
-- End-to-end journeys (MAIR-603): user 4 takes part in no conversation, so the conversation of users
-- 2 and 3 must stay out of its reach. Same template password hash.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES (4, 'Agent', 'Externe', 'agent-externe@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 4, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
-- The users above carry explicit ids: move the id sequence past them, or the first account a
-- journey creates (Administrator) collides with user 2 (MAIR-603).
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
