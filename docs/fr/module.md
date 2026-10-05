# Messages_Web_Service — Présentation du module

## Navigation des modules actifs

Les menus ordinateur et mobile ne proposent plus les modules archivés E-mails
et Fichiers, comme dans la version locale. L'ordre des autres modules et la
visibilité réservée aux administrateurs restent inchangés ; Paramètres reste
accessible via l’AppShell partagé. Les pièces jointes et documents métier des
modules actifs ne sont pas supprimés.

## Un seul espace compte

Le profil est désormais ouvert dans **Paramètres (Settings)**. Les anciens liens
`/profile` et leurs sous-chemins redirigent vers le front Settings configuré
pour les visiteurs authentifiés. La sidebar conserve Paramètres sans doublon
Profil. Si Settings n’est pas configuré correctement, ces anciens liens renvoient
une erreur 503 non mise en cache ; aucune donnée personnelle de démonstration
ni fausse sauvegarde n’est affichée.

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Fournir l’interface de messagerie instantanée avec conversations, contacts et liens vers les objets métier. Les appels passent par BFF Message.

## Public et utilité

Les agents échangeant avec leurs collègues ou leurs groupes de travail.

Domaine fonctionnel: Messagerie instantanée.

## Fonctions disponibles

La présentation par défaut reprend la taille racine de 17px et la police système
de la référence locale. Le header partagé conserve son dimensionnement en rem ;
la règle de police reste prioritaire sur celle de la bibliothèque quel que soit
l’ordre des fichiers CSS de production.
Les tailles de petits textes ne sont pas redéfinies. Les conversations et messages
gardent leurs zones de défilement indépendantes sur ordinateur. Sur les écrans
plus étroits, le bouton de bascule affiche un seul panneau en pleine hauteur et
conserve le brouillon non envoyé lors du changement de panneau.

Le panneau utilise toute la largeur disponible comme la référence, sans plafond
sur grand écran. Les marges extérieures sont de 20px à partir de 768px et de 10px
en dessous ; le panneau conserve l’ombre à deux couches de la référence. Le
conteneur intermédiaire ne coupe pas cette ombre extérieure ; le viewport et
le contenu du fil restent bornés dans leurs propres conteneurs. La colonne des
conversations mesure 300px à partir de 1024px, comme dans la référence. En dessous,
la bascule entre panneaux pleine hauteur est conservée. Ces
styles frontend préservent les scrolls bornés, la bascule et les contrôles de
rédaction accessibles, sans simuler notification, identité ou donnée métier.

- Liste de conversations, messages actifs et recherche de contacts, avec rafraîchissement lorsque l’onglet est visible.
- Envoi direct, réponse dans une conversation, création de groupe et suppression.

Le bootstrap en attente ou refusé n'est pas une liste vide. Les écritures ne sont
disponibles qu'après confirmation ; Réessayer est explicite et single-flight,
conservant le lien profond autorisé et les contacts du bootstrap si leur lecture
est refusée. Les dialogues Nouveau message/Créer un groupe ouverts après reprise
gardent focus initial, boucles Tab/Maj+Tab, Fermer/Échap autorisés et retour au bouton.

Une suppression/disparition confirmée lit immédiatement le fil de remplacement,
y compris la première arrivée dans une liste vide. La réception visible tourne
toutes les deux secondes sans chevaucher lecture, sélection ou mutation en attente.
Les compteurs reçus restent officiels ; une réponse ancienne ne remplace pas une
sélection/écriture récente. Les refus conservent les données connues et permettent
la reprise, sans succès simulé.

La création de groupe conserve le nom, la description optionnelle et les membres
jusqu’à confirmation du service. Pendant l’attente, les champs et contrôles de
fermeture sont désactivés pour empêcher les doublons. Un refus conserve les saisies
pour réessayer et affiche une erreur ; seule la conversation créée par le service
est ajoutée à la liste.
- Dates des conversations et des messages affichées en français (jour/mois et heure:minute), dans le fuseau du navigateur. Les valeurs absentes ou non reconnues sont conservées sans date inventée ; le contenu des messages reste intact.
- Chargement des références projets, tâches et événements, avec actualisation des suggestions au retour dans l’onglet visible. Une panne temporaire conserve la dernière liste reçue ; un refus d’accès la vide.

## Parcours type

### Reprise de session pendant le polling — MAIR-409 / issue #215

Les lectures de synchronisation ne suivent pas les redirections. Une redirection
opaque du navigateur rouvre la même page protégée ; le garde existant décide de
Login et du chemin de retour. Un 401 utilise une seule fois la fin de session et
le rechargement frontend existants, sans répéter le polling avec un cookie refusé
qui semble encore valide. Un 403, une panne réseau ou un 503 conservent messages
connus et brouillon, puis les lectures suivantes peuvent reprendre. Une réponse
obsolète ou masquée ne déclenche pas de navigation. API/BFF, middleware, proxy et
route d’authentification sont inchangés ; cette correction consommateur ne fournit
pas de révocation serveur. Les brouillons ne sont pas durables au rechargement.

Le candidat dispose d’une recette native desktop avant/après avec le garde et la
route de déconnexion inchangés, un cookie jetable et une destination Login QA
explicitement isolée. Login/authentification déployés ne sont pas certifiés.
L’override390×844 est resté réellement1280×720 : cette tranche session n’a pas de
preuve mobile. Intégration et CI applicable verte restent requises pour clôturer215.

1. Charger `/messaging/bootstrap` et sélectionner une conversation.
2. Rechercher un contact ou une référence métier, puis envoyer un message.
3. Consulter les messages renvoyés par le BFF ; la liste et le fil actif se synchronisent à la reprise de l’onglet et toutes les deux secondes lorsqu’il reste visible.

## Place dans Mairie360

Dépôts associés: [BFF_Message](https://github.com/mairie360/BFF_Message).

Ce dépôt contient l’interface navigateur et ses adaptateurs Next.js. Le BFF associé fournit les données métier et coordonne leurs sources.

## Données et état actuel

Conversations et messages passent par Message API. Les contacts proviennent directement de la table SQL `users`, y compris l’utilisateur courant (identifiant `sub` du jeton). Les références métier sont agrégées depuis BFF Project et BFF Calendar. La modification locale du profil, les métadonnées de pièces jointes et l’accusé de lecture ne constituent pas une persistance complète.

## Périmètre et limites

Le CSS ciblé du consommateur Messages restitue l'ombre de sidebar et les boutons
de navigation d'au moins44px de la référence, sans copier la navigation ni changer
l'AppShell publié. Dans le tiroir mobile, la sidebar reste sous son bouton Fermer
au lieu d'hériter de l'empilement desktop. La bascule pleine hauteur conserve une
rangée de48px plutôt que l'ancienne liste empilée. La recette des sources anciennes
utilise le runtime Next16/UI disponible : elle ne certifie pas l'installation
d'origine. Version, identité et notifications fictives ne sont pas réintroduites.
L'empilement de l'ombre du header et la parité globale du shell restent distincts.

Le consommateur composé dispose d'une recette native en vrai390×844 : reprise
initiale au clavier, bascule des panneaux, focus des deux dialogues de création,
navigation mobile, réception2s sans chevauchement, disparition confirmée/reprise
du fil et liste vide confirmée. La recette n'effectue que des GET : elle ne valide
pas les écritures. Le défaut distinct407 d'isolation du brouillon par destinataire
est reproduit sans envoi. Voir le README pour sessions et limites exactes ; cette
vérification du candidat n'est pas une nouvelle paire avec l'ancien ni un test déployé.

Le contrat installé0.4.0 et les fixtures isolées ne prouvent ni stockage binaire
durable, ni acquittement persistant, ni droits déployés. L'acquittement amont actuel
est refusé ; le front ne l'appelle pas et n'invente pas de compteur nul. Download/
liens métier (#176), acquittement (#149/#144) et isolation destinataire du brouillon
(lib-components #407) restent des acceptations distinctes ouvertes. Les tests du
candidat local ne prouvent pas CI applicable verte, intégration main, copie exacte
locale rafraîchie, RGAA toutes routes ou image complète.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
