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
est refusée. Les contrôles Nouveau message/Créer un groupe sont disponibles après
reprise. La correction dédiée au focus des dialogues (MAIR-318, #212) est reportée
avec le RGAA ; elle ne fait pas partie de cette composition fonctionnelle seule.

Nouveau message à un contact (MAIR-204) : si une conversation directe existe déjà
avec ce contact (`kind: 'direct'` et son `contactId`), le message y est publié
(`POST /conversations/{id}/messages`) et cette conversation s'ouvre ; seul un
contact sans conversation directe obtient un nouveau fil via `POST /direct-messages`.
Un envoi refusé conserve le brouillon et ne crée jamais un autre fil à la place.

Une suppression/disparition confirmée lit immédiatement le fil de remplacement,
y compris la première arrivée dans une liste vide. La réception visible tourne
toutes les deux secondes sans chevaucher lecture, sélection ou mutation en attente.
Les compteurs reçus restent officiels ; une réponse ancienne ne remplace pas une
sélection/écriture récente. Les refus conservent les données connues et permettent
la reprise, sans succès simulé.

Un fil jamais chargé n'est pas considéré vide pendant l'attente ou un refus de
lecture. Son nom figure dans le statut de chargement/indisponibilité ; la rédaction
est désactivée jusqu'à une réponse réussie avec le bon identifiant. Une réponse
vide confirmée garde le libellé habituel et permet d'écrire. Les historiques connus
et brouillons restent montés lors d'un échec de rafraîchissement, sans prétendre
isoler les brouillons par fil ni les conserver après navigation. Un ancien callback
ne peut envoyer vers une sélection passée ou non confirmée. Réessayer sélectionne
le fil ou attend une lecture autorisée, sans rejouer d'écriture.

L'ouverture d'un lien `?conversation=` utilise aussi la reprise de session avant
d'afficher un fil du bootstrap sans rapport avec la cible. Un 401 ou une redirection
opaque courants sur une page visible reprennent immédiatement ; une réponse masquée
ou démontée ne navigue pas. Un 403/503 conserve le bootstrap réel et signale la
cible inaccessible sans déconnexion.

La sélection d'un fil après expiration de session lance immédiatement la
navigation existante de la page protégée, sans attendre le polling. Un vrai 401
efface le cookie refusé via la déconnexion locale existante ; une redirection
opaque recharge sans inventer de destination. Les refus 403/503 ne déconnectent
pas. Aucun envoi n'est rejoué ni aucun brouillon durable après connexion promis.

La création de groupe conserve le nom, la description optionnelle et les membres
jusqu’à confirmation du service. Pendant l’attente, les champs et contrôles de
fermeture sont désactivés pour empêcher les doublons. Un refus conserve les saisies
pour réessayer et affiche une erreur ; seule la conversation créée par le service
est ajoutée à la liste.
- Dates des conversations et des messages affichées en français (jour/mois et heure:minute), dans le fuseau du navigateur. Les valeurs absentes ou non reconnues sont conservées sans date inventée ; le contenu des messages reste intact.
- Chargement des références projets, tâches et événements, avec actualisation des suggestions au retour dans l’onglet visible. Une panne temporaire conserve la dernière liste reçue ; un refus d’accès la vide.
- Message à propos d’un projet : la page projet du front Projets pointe vers `/?context=project-<n>`. La page lit le titre du projet auprès de BFF_Message (`GET /link-suggestions`, les objets que l’agent peut lire ; jamais dans l’URL), affiche le bandeau « Message contextuel » (« Ouvrir », « Retirer ») et ouvre « Nouveau message » avec « Message lié au projet « <titre> » ». Fermer la fenêtre permet d’écrire dans une conversation existante. Le projet part comme lien métier (`links`) du premier message, sur `POST /direct-messages` ou dans la conversation, puis le bandeau disparaît ; « Retirer » l’enlève avant (toast « Contexte retiré »). Un projet que l’agent ne peut pas lire, ou une lecture en échec, ouvre la page sans contexte avec le toast « Le projet lié n’est pas accessible ».

Les pièces jointes ne sont pas encore disponibles (MAIR-512) : le BFF répond 503 à
l’upload et refuse tout identifiant de pièce jointe. Le composer partagé affiche
toujours « Joindre un fichier », mais un brouillon contenant des fichiers est refusé
localement en français avant tout appel réseau ; le même texte sans ses fichiers
s’envoie normalement. Les mentions proposent les contacts et les conversations de
groupe ; seules les mentions d’utilisateurs sont transmises au BFF, les mentions de
groupe restent mises en évidence dans le texte. Un refus du BFF à l’envoi, au
message direct ou à la création de groupe est expliqué en français champ par champ
(balises `<` `>`, longueur, destinataire ou membre inconnu) ; les autres refus
gardent le message du BFF.

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

La recette native390×844 du4octobre appartient au candidat historique mixte,
y compris sa correction du focus des dialogues ; elle ne certifie pas cette
composition fonctionnelle seule. Voir le README pour les contrôles et limites
propres à chaque révision. Le défaut distinct407 d'isolation du brouillon par
destinataire reste reproduit sans envoi. Une recette GET seule ne valide ni
écritures, ni persistance ou autorisations déployées.

Le contrat installé0.4.0 et les fixtures isolées ne prouvent ni stockage binaire
durable, ni acquittement persistant, ni droits déployés. L'acquittement amont actuel
est refusé ; le front ne l'appelle pas et n'invente pas de compteur nul. Download/
liens métier (#176), acquittement (#149/#144) et isolation destinataire du brouillon
(lib-components #407) restent des acceptations distinctes ouvertes. Les tests du
candidat local ne prouvent pas CI applicable verte, intégration main, copie exacte
locale rafraîchie, RGAA toutes routes ou image complète.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
### Confirmation de l’envoi — MAIR-370

Le brouillon et ses aperçus restent disponibles si la réponse de succès est incomplète ou concerne un autre fil. L’activation suivante vérifie le fil par lecture, sans répéter l’envoi ni le transfert des pièces jointes. La présence du même identifiant de message dans le fil demandé confirme l’envoi initial. Une saisie modifiée pendant cette reprise reste conservée et demande une nouvelle activation explicite pour être envoyée. Sans identifiant reçu, l’envoi reste à confirmer et la réponse du service doit être examinée. Le brouillon n’est pas conservé après rechargement.


## Direction visuelle commune — MAIR-547

DA claire option 1 : tokens et police communs, navigation accessible et contenu métier conservé. Voir la [recette visuelle](../qa/design-qa.md) pour les preuves, vérifications et limites RGAA.

## Écran V2 (epic MAIR-821)

La messagerie suit la maquette V2 validée ([Figma, parcours F1–F9](https://www.figma.com/design/aZKHSHhAj0NQnutKdS82jk/?node-id=18-902)) sur `@mairie360/lib-components` 2.

- **Cadre (MAIR-838).** Lib 2 : le bandeau de navigation repliable, la barre du haut,
  la typographie et la zone principale pleine hauteur (`mainLayout="fill"` : pas de défilement de page,
  marges 20 px / 24 px) viennent du cadre de la lib ; `app-shell.css` ne garde que la géométrie du module
  de messagerie. Le thème est toujours clair.
- **Cadre (MAIR-844).** Le bandeau affiche le logo de la lib et le nom de la commune (`COMMUNE_NAME`),
  « Messagerie » est actif avec le total des non-lus en badge (« 9+ » au-delà de 9 depuis MAIR-1156), et le pied de page affiche
  la version (`APP_VERSION`) ainsi que les mentions légales et la politique de confidentialité du front Login.
- **États de démarrage (MAIR-847).** Le chargement et l'indisponibilité de la messagerie utilisent
  `Card`, `ErrorAlert` (le démarrage refusé), `Skeleton` et `RetryButton` de la lib (« Chargement en
  cours… », désactivé pendant le chargement).
- **Erreurs et statuts (MAIR-854).** Une action refusée s'affiche dans un `ErrorAlert` de la lib que l'on
  peut fermer, une synchronisation refusée dans un `ErrorAlert` durable (la lecture suivante l'efface) ;
  « Suppression de la conversation en cours… » et le texte d'ouverture d'un fil sont des `Alert` info. Les
  textes et les annonces `alert` / `status` ne changent pas.
- **Réception (MAIR-860).** L'état de la réception automatique est un `StatusPill` de la lib (active :
  succès, actualisation : info, connexion : neutre, retardée : avertissement) ; « Réessayer la réception »
  est un `Button` de la lib (cible de 44 px) affiché seulement quand la réception est retardée.
- **Confirmations (MAIR-865).** « Message direct créé. », « Groupe … créé. » et les autres confirmations
  d'action s'affichent dans un toast de la lib en bas à droite, au-dessus du pied de page, sans déplacer le
  module (5 s, sans titre, fermable à la souris ou au clavier).
- **États vides (MAIR-870).** « Sélectionnez une conversation » (en-tête vide, grand et semi-gras),
  « Aucune conversation trouvée. » (recherche locale sans résultat), « Aucun contact trouvé. » et les textes
  d'attente du fil sont des `Text` de la lib (ton atténué), sans paragraphe stylé à la main ; le fil affiche
  tel quel un `DataState` déjà construit.
- **Icônes du champ de saisie (MAIR-872).** Joindre, mentionner, élément métier, emoji, envoyer, les
  pièces jointes et les suggestions de mention rendent leur glyphe lucide via `Icon` de la lib (`s`, jeton de
  16 px, couleur du texte courant) ; les boutons gardent leur libellé accessible.
- **Fenêtres (MAIR-878).** « Nouveau message » et « Créer un groupe » sont des `Modal` de la lib en petite
  taille (480 px). Le bouton principal (`SendButton` / `CreateButton` de la lib avec son icône) reste désactivé
  tant que le formulaire est incomplet (destinataire + message ; nom du groupe + un membre). Un refus s'affiche
  dans un `ErrorAlert` au-dessus du formulaire, la fenêtre reste ouverte et garde la saisie ; Échap, le fond et
  « Annuler » sont sans effet pendant l'envoi.
- **Base de page (MAIR-1156).** Base de page de la lib 2.3.0 : pas de pied de page (`showFooter={false}`), le
  module est la carte blanche bordée (rayon 12 px, `--mairie-radius-l`) de la zone principale, et le seul titre de
  la page est le `h1` « Messagerie » de la liste. « Messagerie » est actif dans la navigation avec le total des
  non-lus dans le `Counter` de la lib, « 9+ » au-delà de 9 ; Administration reste réservée au rôle.
- **Liste des conversations (MAIR-1157).** La liste a pour titre « Messagerie » et un seul « + » (`IconButton` de la
  lib, infobulle `ToolTip` « Nouvelle conversation ») qui ouvre un `DropdownMenu` de la lib : « Nouveau message » et
  « Créer un groupe » ouvrent les fenêtres existantes. Le menu est annoncé comme tel, s'ouvre avec Entrée / Espace /
  ↓, se parcourt avec ↑ ↓ Début Fin, se ferme avec Échap, Tab ou un clic à l'extérieur et rend le focus au « + »
  (`use-menu-keyboard.ts`, partagé avec le menu de l'en-tête). « Rechercher une conversation » est le `SearchField`
  de la lib qui filtre au fil de la saisie (nom, groupe, service) ; sans résultat, « Aucune conversation trouvée. ».
  Chaque ligne affiche l'`Avatar` de la lib (photo ou initiales, groupes compris) avec sa pastille de présence, le nom
  et l'aperçu tronqués sur une ligne, l'heure dans une colonne fixe à droite et le `Counter` des non-lus de la lib
  (« 9+ »), lu « N messages non lus ».
- **Icônes explicites (MAIR-1158).** Toutes les icônes passent par `Icon` de la lib (`icons` de la lib 2.3 pour les
  glyphes de la messagerie). Saisie : « Joindre un fichier » `file-up`, « Mentionner une personne » `at-sign`, « Lier
  un élément » `hash`, « Insérer un emoji » `smile-plus`, « Envoyer » `send`, chacun un `IconButton` de la lib avec
  son `ToolTip`. En-tête : « Appeler » `phone` et « Lancer une visio » `video` sont affichés indisponibles
  (`aria-disabled`, toujours atteignables au clavier, infobulle « … · bientôt disponible »), « Rechercher dans la
  conversation » `text-search` seulement s'il est branché, « Plus d'actions » `more-horizontal`. Menus :
  `check-check`, `trash`, `message-square-plus`, `users`. Éléments liés : projet `folder-kanban`, tâche
  `list-checks`, dossier `folder-open`, événement `calendar`, service `building-2`.
- **Mes bulles (MAIR-1159).** Mes messages utilisent les jetons de la lib 2.3 `--mairie-message-own-background`
  (#efebe2), `--mairie-message-own-on` (#383f51, contraste 8,8:1) et `--mairie-message-own-border` (#d6d0c3), leurs
  éléments liés et pièces jointes aussi ; les bulles reçues gardent la surface blanche et `--mairie-border`. L'heure
  est au-dessus de la bulle, alignée à droite pour mes messages.
- **Messages non lus (MAIR-1160).** Le bandeau « N notifications non lues » disparaît (« Marquer comme lus » reste
  dans « Plus d'actions »). Une conversation s'ouvre sur son premier message non lu, après le `Divider` de la lib
  « Nouveaux messages » (`NewMessagesSeparator`) ; les non-lus sont les `unreadCount` derniers messages écrits par
  d'autres. La pastille neutre `UnreadMessagesPill` (`Button` de la lib, collée en bas du fil, région live polie)
  annonce « N nouveaux messages » et diminue à mesure qu'ils deviennent visibles ; un clic fait défiler en douceur
  jusqu'au dernier message (instantané avec `prefers-reduced-motion`). Atteindre la fin du fil par l'agent (molette,
  toucher, clavier, pointeur, pastille) retire la pastille et marque la conversation lue ; un fil sans défilement est
  lu à l'ouverture ; le placement à l'ouverture et les autres défilements programmatiques ne lisent jamais. Les
  compteurs de la liste et de la navigation suivent tous deux la conversation rafraîchie.
- **Réception retardée (MAIR-1161).** « Réception automatique active » et les autres pastilles de réception
  disparaissent : rien n'est affiché tant que la réception fonctionne. Quand la connexion temps réel est perdue,
  `MessagesReceptionDelayed` affiche au-dessus du module une petite `Alert` d'avertissement de la lib « Réception des
  messages retardée », annoncée par sa région live polie sans prendre le focus, avec « Réessayer la réception ». La
  connexion est un WebSocket : le bandeau apparaît quand elle est abandonnée (5 tentatives échouées, ou
  onglet évincé par une 6e connexion du même agent), les messages restant rechargés toutes les 2 s. À la reconnexion, le
  module relit les messages manqués, puis le bandeau disparaît.
- **Statut d'envoi (MAIR-1162).** `MessageSendStatus` sous mes bulles : « Envoyé » (check) sous mon dernier message
  confirmé, « Envoi… » (loader-circle qui ne tourne que sans `prefers-reduced-motion`, bulle atténuée) pendant la
  confirmation, « Non envoyé · Réessayer l'envoi » (circle-alert, `Button` lien de la lib avec refresh-cw, bord en
  pointillés couleur erreur) après un échec. Chaque changement est annoncé par une région live polie du fil. Une
  relance envoie le même message une seule fois (une tentative par conversation ; un envoi depuis la saisie d'un message
  déjà remis par la bulle n'écrit rien) ; la saisie garde son brouillon jusqu'à la confirmation (MAIR-370) et le libère
  quand la bulle l'a remis sans changement. Seul le fil défile : la zone de saisie garde sa hauteur.
- **« Plus d'actions » (MAIR-1163).** Le menu de l'en-tête est un `DropdownMenu` de la lib (clavier : Entrée / Espace /
  ↓ pour ouvrir, ↑ ↓ Début Fin, Échap et clic extérieur pour fermer, focus rendu au bouton). Direct : « Marquer les
  messages comme lus », « Rechercher dans la conversation », « Créer un groupe avec <personne> » (ouvre « Créer un
  groupe » avec la personne présélectionnée) ; groupe : « Marquer comme lus », « Rechercher dans la conversation »,
  « Gérer les membres » ; puis « Supprimer la conversation » (danger, séparée). Recherche et membres n'apparaissent
  qu'une fois branchés (MAIR-1164, MAIR-1165). « Marquer comme lus » acquitte jusqu'au dernier message : les compteurs
  de la liste et de la navigation reviennent à zéro. La suppression est confirmée dans le `ConfirmModal` de la lib
  (danger), puis le toast « Conversation supprimée. » ; un échec est l'`ErrorAlert` danger au-dessus du module.
- **Recherche dans la conversation (MAIR-1164).** « Rechercher dans la conversation » (bouton de l'en-tête ou « Plus
  d'actions ») ouvre un `Drawer` de la lib (taille m, focus gardé dans le panneau, rendu au bouton à la fermeture) :
  un champ de recherche, des `Tabs` fixes « Messages · Fichiers · Personnes » avec leur compteur, et les résultats
  qui défilent dessous (`GET /conversations/{id}/search`, les trois onglets cherchés ensemble 300 ms après la dernière
  touche, les requêtes précédentes annulées). Les correspondances trouvées par le BFF sont surlignées dans chaque
  extrait ; « Afficher plus de résultats » charge la page suivante. Choisir un message ferme le panneau, fait défiler
  le fil en douceur jusqu'à lui (sans animation si le mouvement est réduit) et le met en évidence deux secondes ;
  « Écrire » d'une personne ouvre la conversation directe avec elle, ou « Nouveau message » vers elle. Chargement,
  erreur (avec « Réessayer ») et aucun résultat sont des `DataState` de la lib. L'onglet fichiers reste vide tant que
  le BFF ne stocke pas de pièce jointe.
- **Membres d'un groupe (MAIR-1165).** L'en-tête d'un groupe affiche un `AvatarGroup` de la lib « N membres, gérer
  les membres » (aussi « Gérer les membres » dans « Plus d'actions »), qui ouvre le `Drawer` de la lib « Membres du
  groupe » (`GET /conversations/{id}/members`, lu à l'ouverture du panneau puis quand la taille du groupe change).
  Chaque membre est listé avec son service et le badge « Administrateur » (`Tag` de la lib) ; l'administrateur du
  groupe (`canManage`) a aussi « Ajouter des membres » (recherche dans l'annuaire, cases `Checkbox` de la lib,
  validation) et « Retirer » par membre ; ces actions sont masquées pour un simple membre. Chacun peut « Quitter le
  groupe » après un `ConfirmModal` de la lib : la conversation quitte la liste et un toast le confirme. Une action
  refusée est un `ErrorAlert` de la lib dans le panneau, la sélection conservée. Chaque changement ajoute au fil la note
  système renvoyée par le BFF, centrée (« Vous avez ajouté Sophie Leroy au groupe. », « Paul Martin vous a retiré du
  groupe. »…), et la nouvelle taille du groupe à la liste ; une note système n'est jamais non lue ni « Envoyé ».
- **Mentions et liens (MAIR-1166).** Taper `@` (ou le bouton « Mentionner une personne ») ouvre
  `MentionSuggestions` avec les sections « Tout le monde », « Groupes et services » et « Personnes »
  (`GET /conversations/{id}/mention-suggestions`) ; `#` (« Lier un élément ») liste les projets, événements et tâches
  que l'agent peut lire, avec l'icône de leur type et leur détail (`GET /link-suggestions`). Le champ est une combobox
  et la liste une listbox : ↑ ↓ pour se déplacer, Entrée / Tab pour choisir, Échap pour fermer, et la liste disparaît
  quand plus rien ne correspond ; Entrée envoie quand aucune liste n'est ouverte. Un tag choisi est figé (suivi d'une
  espace, la suite est du texte). L'envoi porte `mentionIds`, `mentionEveryone`, `groupMentionIds` et `links`. Dans
  les bulles, les tags sont en couleur d'accent, et un élément lié qui a une page (`url` du BFF) est un `Link` de la
  lib qui l'ouvre. Le tag d'une personne est un bouton souligné qui ouvre sa fiche (nom, service, présence, « (vous) »
  pour l'agent lui-même) ; « Écrire » y ouvre la conversation directe avec elle, ou « Nouveau message » à son nom s'il
  n'y en a pas encore. `@tout le monde` et les groupes ne sont pas cliquables, donc pas soulignés.
- **Alertes de mention.** Quand un collègue mentionne l'agent (par son nom, `@everyone` ou un groupe), la cloche du
  bandeau la compte (« Notifications, 1 non lues ») et son panneau (`NotificationCenter` de la lib) affiche
  « Mention dans « <conversation> » » avec « <personne> vous a mentionné(e). » (l'auteur, lu une fois dans la
  conversation ; « Un message vous mentionne. » en attendant ou si cette lecture échoue). « Ouvrir » ouvre la conversation dans la page (`?conversation=<id>`, sans
  rechargement) et marque l'alerte lue, comme ouvrir la conversation depuis la liste ou « Marquer comme lu ». Une
  mention donne une seule alerte, bien qu'elle arrive avec le signal du message ; aucune n'est créée pour la
  conversation que l'agent lit. Les alertes vivent en mémoire de la page pour le compte connecté : un rechargement,
  ou un autre compte qui se connecte, les oublie.
- **Actions d'un message et réponse (MAIR-1167).** Survoler une bulle, lui donner le focus clavier (chaque bulle qui a
  des actions est focalisable) ou un appui long sur écran tactile affiche `MessageActionsToolbar` (`IconButton` de la
  lib avec leur `ToolTip`) : « Réagir », « Répondre », et sur mes messages « Modifier » et « Supprimer ». « Répondre »
  affiche `ReplyBar` au-dessus du champ (auteur, extrait, « Annuler la réponse ») et y place le focus ; l'envoi porte
  `replyTo` et la barre disparaît une fois le message confirmé. Une réponse affiche `MessageQuote` au-dessus de sa
  bulle (auteur et extrait de `quoted`) ; un clic fait défiler en douceur jusqu'au message d'origine et le met en
  évidence. La citation d'un message supprimé indique « Message supprimé ».
- **Modifier un message (MAIR-1168).** « Modifier » (barre d'actions, mes messages seulement) remplace la bulle par
  `MessageEditBox` : un `TextArea` de la lib avec les mêmes boutons et suggestions `@` / `#` que la saisie (les tags du
  message restent des tags), l'aide « Échap pour annuler · Entrée pour enregistrer », Annuler et Enregistrer
  (désactivé tant que le texte est vide ou inchangé). L'enregistrement (`PATCH /conversations/{id}/messages/{messageId}`,
  tous les champs de tags envoyés pour qu'un tag retiré disparaisse) remplace le message ; son heure est alors suivie
  de « · modifié ». Un refus est un `ErrorAlert` de la lib sous la zone, le texte conservé.
- **Supprimer un message (MAIR-1169).** « Supprimer » (barre d'actions, mes messages seulement) ouvre le
  `ConfirmModal` de la lib (danger) « Supprimer le message ? » / « Le message sera remplacé par « Message supprimé »
  pour tous les participants. ». Une fois confirmé (`DELETE /conversations/{id}/messages/{messageId}`),
  `DeletedMessage` (icône ban, italique atténué) remplace la bulle, ses tags, sa citation et ses réactions ; plus
  aucune action n'y est proposée, et l'aperçu de la liste indique « Message supprimé » quand c'était le dernier
  message. Un échec est un `ErrorAlert` danger au-dessus du fil, le message conservé.
- **Réactions (MAIR-1170).** « Réagir » (barre d'actions) ouvre `ReactionPicker` (👍 ❤️ 😂 🎉 👀 🙏 ✅, `Button` de
  la lib qui prennent le focus, ← → pour se déplacer, Échap pour fermer). `MessageReactions` affiche une pastille par
  emoji sous la bulle : un bouton bascule (`aria-pressed`, « 👍 3, dont vous »), la mienne mise en avant, les noms des
  agents dans son `ToolTip` de la lib, et « Ajouter une réaction ». Un clic ajoute ou retire ma réaction (`POST` /
  `DELETE /conversations/{id}/messages/{messageId}/reactions`) ; les réactions renvoyées par le BFF remplacent celles
  du message. Les autres participants les voient au rafraîchissement déclenché par l'événement `message_reacted` du
  flux. Un échec est l'`ErrorAlert` danger au-dessus du fil.
- **États vides (MAIR-1171).** Un seul visuel illustré par écran, avec le `DataState` de la lib 2.3 : sans aucune
  conversation, la liste dit seulement « Aucune conversation pour l'instant. » et le fil affiche « Commencez à
  échanger » (taille m, illustré) ; avec des conversations sans sélection, « Sélectionnez une conversation » (taille
  m) ; une conversation sans message (groupe tout juste créé) affiche « Aucun message pour l'instant » (taille s,
  icône), centré. Une recherche sans résultat garde « Aucune conversation trouvée. ».
