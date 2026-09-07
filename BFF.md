# BFF — Messagerie

Référentiel de besoins harmonisé le 5 septembre 2026. Documentation uniquement : aucune route ni migration n'est créée par ces fichiers. Les chemins BFF sont relatifs au service indiqué, pas au préfixe des proxies Next.js ; les chemins backend conservent leurs préfixes réels.

Le front appelle BFF Message pour les conversations/messages. Les pièces jointes et accusés de lecture du BFF sont encore simulés ; le profil édité dans ce BFF n'est pas persisté dans Core. Les références projets/tâches/événements sont agrégées actuellement dans une route Next.js du Web Service, pas dans BFF Message.

Tables et routes propriétaires : [BACKEND.md](BACKEND.md).

`Existant` : déclaré dans les sources locales ; `Partiel` : route présente mais données manquantes, SQL direct ou mémoire ; `Client généré` : chemin observé dans le client installé, déploiement non vérifié ; `Proposé` : contrat cible à implémenter/valider. Pour les tables, `SQL observé` ne prouve pas qu'une migration est déployée.

## Routes communes

Les identifiants renvoyés par un domaine restent ceux de son backend, même lorsqu'un BFF les sérialise en chaîne. `phone` côté Core/DTO correspond à `users.phone_number` en SQL ; `name`/`fullName` est composé à partir du prénom et du nom, sans découpage automatique inverse. Les rôles d'affichage sont adaptés par chaque front à partir de `roles`, sans nouvelle table de rôles par module. Le profil s'édite dans **Paramètres > Profil** ; les anciennes pages `/profile` ne définissent pas un stockage distinct.

| Méthode | Service et route BFF | Route backend / source | Données nécessaires au front | État |
| --- | --- | --- | --- | --- |
| GET | BFF User `/me` (alias `/session/me`) | Core `GET /api/v1/user/me/` + `GET /api/v1/groups/` | Identité, rôles et groupes communs ; réponse actuelle `{user, groups, roles}` ; enrichir avec identifiant, avatar, service, poste et dernière connexion | Partiel |
| POST | BFF User `/auth/logout` | Actuel : suppression du cookie ; cible : Core `POST /api/v1/sessions/revoke` avec le refresh token de la session courante | Déconnexion ; révocation serveur à brancher, pas une suppression de toutes les sessions | Partiel |
| GET | BFF User `/notifications` | Core `GET /api/v1/user/me/notifications/` | Notifications du bandeau et compteur non lu ; ne pas utiliser la constante de démonstration 3 | Proposé |
| PATCH | BFF User `/notifications/{notificationId}/read` | Core `PATCH /api/v1/user/me/notifications/{notificationId}/read` | Marquage lu et compteur actualisé pour l'utilisateur connecté | Proposé |

## Routes du module

| Méthode | Service et route BFF | Route backend / source | Données nécessaires au front | État |
| --- | --- | --- | --- | --- |
| GET | BFF Message `/messaging/bootstrap` | Message `GET /v1/`, détail conversation ; Core identité/annuaire | currentUser, conversations, contacts, activeConversationId, messages | Partiel ; contacts absents du schéma OpenAPI du bootstrap |
| GET | BFF Message `/conversations` | Message `GET /v1/` | search, limit, cursor ; id, kind direct/group, nom, participants, dernier message/date, unreadCount, avatar | Partiel ; kind forcé group et cursor ignoré |
| GET | BFF Message `/conversations/{conversationId}/messages` | Message `GET /v1/{chatId}/` | Messages, auteur, date réelle, pièces jointes, mentions/citation, pagination before/after/nextCursor | Partiel ; pagination/champs manquants, schéma OpenAPI incorrect |
| POST | BFF Message `/conversations/{conversationId}/messages` | Message `POST /v1/{chatId}/messages/` | content, attachmentIds, mentionIds ; message persisté et date backend | Partiel ; seul content transmis, schémas OpenAPI inversés |
| POST | BFF Message `/direct-messages` | Message `POST /v1/` + `POST /v1/{chatId}/messages/` | recipientId, message ; vraie conversation directe | Partiel ; type/nom construits artificiellement |
| POST | BFF Message `/groups` | Message `POST /v1/` | Nom, description, memberIds d'une conversation de groupe ; distinct d'un groupe d'habilitation Core | Partiel ; description ignorée |
| DELETE | BFF Message `/conversations/{conversationId}` | Message `DELETE /v1/{chatId}/` | Suppression autorisée d'une conversation | Existant côté BFF ; API via client généré |
| GET | BFF Message `/contacts` | Actuel : SQL users ; cible : Core `GET /api/v1/users/directory/` | id, nom, e-mail, service, avatar, présence si source disponible | Partiel ; présence actuellement offline constante |
| POST | BFF Message `/attachments` | Message `POST /v1/attachments/` → Files `POST /api/v1/files/` | Vrai upload multipart ; id, nom, taille, MIME et accès autorisé | Partiel ; aucun traitement/persistence de fichier actuel |
| GET | BFF Message `/attachments/{attachmentId}/content` | Message `GET /v1/attachments/{attachmentId}/content` → Files contenu | Lecture autorisée d'une pièce jointe | Proposé |
| POST | BFF Message `/conversations/{conversationId}/read` | Message `POST /v1/{chatId}/read` | readUntilMessageId, readAt et unreadCount persistés | Partiel ; unreadCount=0 constant actuellement |
| GET, PATCH | BFF Message `/me` (ancien profil) | Cible : Core `GET, PATCH /api/v1/user/me/` ; édition via Paramètres | Même identité commune ; ne pas conserver un profil Messagerie distinct | Partiel ; PATCH mémoire, le shell lit déjà BFF User /me |
| GET | Next.js `/business-references` | BFF Project `GET /projects-page` + `GET /projects/{projectId}` ; BFF Calendar `GET /calendar/bootstrap` | Références project/task/event et disponibilité par source | Existant dans le Web Service, pas une route BFF Message |

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
