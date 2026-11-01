# Contrat web service / BFF

Ce web service consomme **BFF_Message**, son seul BFF. Le contrat vient du paquet publié `@mairie360/bff-message-openapi`, épinglé à une version exacte dans `package.json` : [contracts/openapi.json](contracts/openapi.json) en est la reconstruction versionnée, et les types utilisés par le code viennent directement du paquet.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. `/api/auth/logout` est une route locale qui efface le cookie de session, sans appel réseau ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 CheckApiResponse |
| GET | `/business-references` | 200 BusinessReferencesResponse |
| POST | `/attachments` | 201 Pièce jointe téléchargée avec succès |
| GET | `/messaging/bootstrap` | 200 Informations de démarrage pour l’utilisateur actuel |
| GET | `/contacts` | 200 Liste des contacts |
| GET | `/conversations` | 200 Liste des conversations de l’utilisateur actuel |
| DELETE | `/conversations/{conversationId}` | 200 Conversation supprimée avec succès |
| POST | `/conversations/{conversationId}/read` | 200 Conversation mise à jour |
| POST | `/groups` | 201 Groupe créé avec succès |
| GET | `/me` | 200 Profil utilisateur actuel |
| PATCH | `/me` | 200 Profil utilisateur mis à jour |
| GET | `/conversations/{conversationId}/messages` | 200 Liste des messages de la conversation |
| POST | `/conversations/{conversationId}/messages` | 201 Message créé avec succès |
| POST | `/direct-messages` | 201 Message direct créé avec succès |

## Mise à jour et validation

Le paquet est épinglé à une version exacte : une release `X.Y.Z` de BFF_Message, ou, tant qu’aucune release n’est coupée, le paquet `0.0.0-dev.<sha>` publié par la CICD pour le commit courant de son `main` (MAIR-509), ou, une fois ce commit livré en staging, le paquet `0.0.0-staging.<sha40>` du même commit, préféré lors d’une release staging pour la lisibilité (MAIR-600 ; jamais `0.0.0-staging.<sha court>` ni une plage). Après une nouvelle version, installer le paquet (`npm install --save-exact @mairie360/bff-message-openapi@<version>`), aligner l’image `bff-message` des `docker-compose*.yml` sur le même commit (`X.Y.Z`, `dev-<sha7>` ou `staging-<sha7>` pour un paquet staging, `scripts/contract-version.mjs`), puis exécuter `npm run contracts:sync`, `npm run contracts:check` et `npm test`. Ces commandes fonctionnent hors ligne et ne dépendent d'aucun checkout voisin ; la CI rejoue la vérification.

## Références métier

`/business-references` est agrégé dans BFF Message depuis Project API et Calendar API (`PROJECT_API_URL`, `CALENDAR_API_URL`, MAIR-525). Le web service relaie la même réponse. Les pièces jointes, groupes ou profils déjà gérés en mémoire par le BFF ne deviennent pas persistants par cet alignement.
