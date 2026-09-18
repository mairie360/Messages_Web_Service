-- Seed minimal pour les tests isolés (performance / sécurité) du front Messages.
-- L'utilisateur 2 est celui référencé par les JWT de test (claim sub = "2") :
--   * load-test.js le signe dynamiquement et l'envoie en cookie accessToken,
--   * docker-compose-security.yml injecte un cookie statique via le replacer ZAP.
-- L'utilisateur 3 existe pour que /contacts (annuaire lu via Core API, qui
-- interroge la même table users, en excluant l'appelant) renvoie au moins une entrée.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES
  (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr', 'dummy', 'active'),
  (3, 'Contact', 'Sample', 'contact-sample@mairie360.fr', 'dummy', 'active')
ON CONFLICT (id) DO NOTHING;
-- Rôle de l'utilisateur de test, repris par le shell du front (GET /me de BFF Message).
INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
