# Acquittement explicite des messages affichés — MAIR-269

Le menu d’actions existant du fil propose « Marquer les messages affichés comme
lus » grâce au paquet partagé réellement publié 0.6.12. Après fermeture du menu,
le composant identifie le dernier message qui intersecte la zone visible du fil.
Un fil masqué, un message absent ou une sélection périmée ne lancent pas l’action.

Le frontend utilise l’opération publiée Message 0.4.0
`POST /conversations/{conversationId}/read`, avec `readUntilMessageId` explicite.
Aucun acquittement au bootstrap, au focus ou pendant le polling, aucune remise à
zéro locale. Après une réponse de succès cohérente, une nouvelle lecture
`GET /conversations` fournit les compteurs affichés ; le zéro de l’ancien
provider ne suffit pas. Un changement de sélection ou démontage invalide les
réponses tardives. Un refus conserve le fil et les compteurs connus avec un
message permettant de réessayer.

Les tests exécutent la vraie page frontend, le proxy et des mocks des contrats
publiés : demandes concurrentes, réponses POST/GET périmées, réponses incohérentes
et refus. Ils ne certifient pas l’authentification déployée, les permissions ou la
persistance ; il faut un compte dev utilisable et une preuve du déploiement des
services. Le pin BFF et les sources API/BFF restent inchangés.
