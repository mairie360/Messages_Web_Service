# Backend — Messagerie

Correspondance front/BFF : [BFF.md](BFF.md). Référentiel de besoins harmonisé le 5 septembre 2026. Documentation uniquement : aucune route ni migration n'est créée par ces fichiers. Les chemins BFF sont relatifs au service indiqué, pas au préfixe des proxies Next.js ; les chemins backend conservent leurs préfixes réels.

`Existant` : déclaré dans les sources locales ; `Partiel` : route présente mais données manquantes, SQL direct ou mémoire ; `Client généré` : chemin observé dans le client installé, déploiement non vérifié ; `Proposé` : contrat cible à implémenter/valider. Pour les tables, `SQL observé` ne prouve pas qu'une migration est déployée.

Les tables sont des sources ou des besoins cibles, pas un script SQL. Les références interservices (`user_id`, `file_id`, etc.) sont logiques : elles n'imposent pas de clé étrangère entre bases distinctes. Les BFF doivent à terme passer par les API propriétaires ; les accès SQL directs et replis mémoire actuels sont signalés. Les permissions restent contrôlées par le serveur.

## Tables communes

| Table / source propriétaire | Clés et données nécessaires | État |
| --- | --- | --- |
| Core `users` | `id` ; `first_name`, `last_name`, `email`, `phone_number`, `status`, `is_archived`, `first_connect`. `password` reste exclusivement côté serveur | SQL observé |
| Core `roles`, `user_roles` | `roles.id`, `roles.name` ; association `user_roles(user_id, role_id)` vers `users.id` et `roles.id` | SQL observé |
| Core `groups`, `group_users` | `groups.id`, `owner_id`, `name`, `description` ; association `group_users(group_id, user_id)` ; nomenclature cible commune basée sur Core | SQL observé dans Core ; divergence `group_members` dans les BFF User/Calendar/Project à résoudre, pas une seconde table cible |
| Core `sessions` | `id`, `user_id`, `created_at`, `expires_at`, `device_info`, `ip_address`, `revoked_at` ; `token_hash` interne, jamais exposé. Dernière connexion dérivée des sessions, pas de la date courante | SQL observé ; vue `v_sessions` utilisée par Core |
| Core `user_profiles` | `user_id` unique vers `users.id` ; `avatar_file_id` vers Files `files.id`, `service_id` vers `services.id`, `position`, `biography` ; `address`, `city` seulement pour compatibilité des anciens profils | Proposé ; ne pas dupliquer identité, mot de passe ou rôles |
| Core `services` | `id`, `code` unique, `name`, `active` ; même annuaire pour Paramètres, Administration, Calendrier, contacts et membres de projets | Proposé ; distinct des groupes d'habilitation |
| Core `notifications` | `id`, `user_id`, `type`, `title`, `body`, `resource_type`, `resource_id`, `created_at`, `read_at` ; source du compteur commun | Proposé ; distinct des préférences `user_notification_settings` |

## Tables du module

| Table / source propriétaire | Clés et données nécessaires | État |
| --- | --- | --- |
| Message `chats` | `id`, `name`, `description`, `kind` direct/group, `created_by`, `created_at`, `updated_at` | Cible proposée ; DTO chat existant, nom physique SQL non vérifié |
| Message `chat_members` | Association `(chat_id, user_id)` ; utilisateurs Core ; à ne pas confondre avec Core group_users | Cible proposée ; schéma SQL Message absent localement |
| Message `messages` | `id`, `chat_id`, `sender_id`, `content`, `created_at`, `updated_at`, `quoted_message_id` | Cible proposée ; DTO Message expose notamment sender_id et le champ historique sitation |
| Message `message_attachments` | `id`, `message_id` éventuellement nul avant envoi, `file_id` vers Files files, `uploaded_by` | Proposé ; pas d'identifiants temporaires considérés persistés |
| Message `message_mentions` | `id`, `message_id`, `target_type`, `target_id` ; références utilisateur/groupe ou métier selon besoin UI | Proposé ; ne pas confondre mention et citation |
| Message `chat_read_states` | Clé `(chat_id, user_id)`, `last_read_message_id`, `read_at` ; source de unreadCount | Proposé |
| Files `files` | `id`, `name`, `mime_type`, `size_bytes`, `storage_key`, `owner_id` ; mêmes métadonnées que Fichiers | Proposé ; accès après contrôle de la conversation |
| Project `projects`, `tasks` ; Calendar `events` | Références métier lues via leurs BFF, identifiants du domaine propriétaire | SQL observé dans leurs BFF ; aucune table copiée dans Message |
| Présence utilisateur | État temps réel si disponible ; ne pas déduire online/offline d'un rôle ou d'une constante | Source non raccordée, pas une table imposée |

## Routes backend communes

| Méthode | Service et route backend | Tables / source | État |
| --- | --- | --- | --- |
| GET | Core `/api/v1/user/me/` | `users`, `roles`, `user_roles` ; cible : `user_profiles`, `services`, `sessions` | Existant ; enrichissement proposé (notamment `id`, absent de GetMeResponseView local) |
| PATCH | Core `/api/v1/user/me/` | `users` ; cible : `user_profiles` | Existant pour prénom, nom, e-mail, téléphone ; extension proposée pour le profil |
| GET | Core `/api/v1/groups/` | `groups`, `group_users` | Existant ; groupes de l'appelant |
| GET | Core `/api/v1/sessions/` | `sessions`, vue `v_sessions` | Existant ; sessions de l'appelant |
| GET | Core `/api/v1/sessions/history` | `sessions`, vue `v_sessions` | Existant ; historique de l'appelant |
| POST | Core `/api/v1/sessions/refresh` | `sessions` ; entrée `refresh_token` | Existant |
| POST | Core `/api/v1/sessions/revoke` | `sessions` ; entrée `refresh_token` | Existant ; ce n'est pas une révocation par `sessionId` |
| DELETE | Core `/api/v1/sessions/{sessionId}` | `sessions` ; session appartenant à l'appelant | Proposé pour la déconnexion d'un autre appareil, sans exposer son refresh token |
| GET | Core `/api/v1/services/` | `services` | Proposé ; annuaire unique |
| GET | Core `/api/v1/users/directory/` | `users`, `user_profiles`, `services`, `roles`, `user_roles`, `groups`, `group_users` | Proposé ; annuaire limité au périmètre autorisé |
| GET | Core `/api/v1/user/me/notifications/` | `notifications` ; filtre utilisateur connecté | Proposé |
| PATCH | Core `/api/v1/user/me/notifications/{notificationId}/read` | `notifications.read_at` ; filtre utilisateur connecté | Proposé |

## Routes backend du module

| Méthode | Service et route backend | Tables / source | État |
| --- | --- | --- | --- |
| GET, POST | Message `/v1/` | Cible `chats`, `chat_members`, `messages`, `chat_read_states` | Client généré ; enrichissements kind/participants/pagination proposés |
| GET, DELETE | Message `/v1/{chatId}/` | Cible `chats`, `chat_members`, `messages` | Client généré ; pagination avant/après à compléter |
| POST | Message `/v1/{chatId}/messages/` | Cible `messages`, `message_attachments`, `message_mentions` | Client généré ; pièce jointe/mention à brancher |
| PATCH, DELETE | Message `/v1/{chatId}/messages/{messageId}/` | Cible `messages` et associations | Client généré ; pas d'action front correspondante exposée dans messageClient actuel |
| GET, POST | Message `/v1/{chatId}/users/` | Cible `chat_members`, identités Core | Client généré |
| DELETE | Message `/v1/{chatId}/users/{userId}/` | Cible `chat_members` | Client généré |
| GET | Message `/v1/stream` | Événements de conversation/message (SSE) | Client généré ; raccordement au front à prévoir si temps réel attendu |
| POST | Message `/v1/{chatId}/read` | `chat_read_states`, `messages`, appartenance chat_members | Proposé |
| POST | Message `/v1/attachments/` | `message_attachments`, Files `files` et stockage objet | Proposé |
| GET | Message `/v1/attachments/{attachmentId}/content` | `message_attachments`, `chat_members`, Files `files` | Proposé |
| POST | Files `/api/v1/files/` | `files` + stockage objet ; propriétaire utilisateur connecté | Proposé ; même route que Fichiers |
| GET | Files `/api/v1/files/{fileId}/content` | `files`, stockage objet ; droits Message vérifiés avant délégation | Proposé ; même route que Fichiers |
| GET | Project `/api/v1/projects/` | `projects`, `project_members` | Client généré via BFF Project ; références métier |
| GET | Project `/api/v1/projects/{projectId}/tasks/` | `tasks` | Client généré via BFF Project ; références métier |
| GET | Calendar `/v1/calendar` | `events`, `event_members`, `calendar_event_metadata` | Client généré via BFF Calendar ; références métier |

## Points d'alignement

| Sujet | Contrat / écart |
| --- | --- |
| Correspondances | `conversationId` BFF correspond à `chatId` du client Message. Les tables de conversation sont une cible logique, à confronter aux migrations du backend absent ; ne pas créer un second stockage si ces entités existent sous un autre nom. |
| Profil | Conserver le GET commun BFF User /me et centraliser l'édition dans Paramètres. Les routes historiques /me de BFF Message devront déléguer à Core ou disparaître lors d'une modification applicative séparée. |

## Sources

| Périmètre | Référence |
| --- | --- |
| Front inspecté | [src/clients/messageClient.ts](src/clients/messageClient.ts) |
| Identité / sessions / groupes | [Core_API 9904624](https://github.com/mairie360/Core_API/tree/99046240dd9742217d2a2c3d282721b785cacca0/src) ; [BFF_user b7c3477](https://github.com/mairie360/BFF_user/tree/b7c3477f858073aa846ba0129cbb29152528e6d2/src) |
| BFF métier inspecté | [BFF_Message 095ec6b](https://github.com/mairie360/BFF_Message/tree/095ec6b5df26d795d16499ecfc772a72a28932b6/src) |
| Client API installé | `@mairie360/message-api-openapi@0.5.0` ; chemin et DTO vérifiés localement, pas appel réseau de validation |
| Sources projets | [BFF_Project 7bfa4b0](https://github.com/mairie360/BFF_Project/tree/7bfa4b04362bc4577c8a1919659e31357c69025b/src) ; [Project_API 4ff22c5](https://github.com/mairie360/Project_API/tree/4ff22c529801d22e0a6e4bf5359b3e85a85d61af/src) |
| Sources calendrier | [BFF_Calendar d0fcce4](https://github.com/mairie360/BFF_Calendar/tree/d0fcce44f9153c95623198aa335484459f8f0387/src) |
