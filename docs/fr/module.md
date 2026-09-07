# Messages_Web_Service — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Fournir l’interface de messagerie instantanée avec conversations, contacts et liens vers les objets métier. Les appels passent par BFF Message.

## Public et utilité

Les agents échangeant avec leurs collègues ou leurs groupes de travail.

Domaine fonctionnel: Messagerie instantanée.

## Fonctions disponibles

- Liste de conversations, messages actifs et recherche de contacts.
- Envoi direct, réponse dans une conversation, création de groupe et suppression.
- Chargement des références projets, tâches et événements.

## Parcours type

1. Charger `/messaging/bootstrap` et sélectionner une conversation.
2. Rechercher un contact ou une référence métier, puis envoyer un message.
3. Mettre à jour la conversation et consulter les messages renvoyés par le BFF.

## Place dans Mairie360

Dépôts associés: [BFF_Message](https://github.com/mairie360/BFF_Message).

Ce dépôt contient l’interface navigateur et ses adaptateurs Next.js. Le BFF associé fournit les données métier et coordonne leurs sources.

## Données et état actuel

Conversations et messages passent par Message API. Les contacts proviennent directement de la table SQL `users`; le contexte utilisateur est adapté depuis Core. Les références métier sont agrégées depuis BFF Project et BFF Calendar. La modification locale du profil, les métadonnées de pièces jointes et l’accusé de lecture ne constituent pas une persistance complète.

## Périmètre et limites

L’upload de pièces jointes fabrique actuellement des métadonnées et ne fournit pas un stockage binaire durable. Le marquage lu renvoie un compteur nul sans écrire dans Message API. Les groupes de conversation passent par l’API, tandis que certaines données de profil restent locales au processus.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
