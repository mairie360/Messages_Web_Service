# Données initiales serveur

Le module Messages affiche les données initiales confirmées via les lectures GET du SDK publié épinglé, un adaptateur Axios propre à la requête et le proxy existant. Les lectures utilisent `no-store` et l’origine publique configurée et validée. Le serveur lit uniquement le cookie d’accès ; le renouvellement reste dans la reprise navigateur existante. Aucun jeton, cookie ni champ de réponse inconnu n’est sérialisé.

Le serveur lit le bootstrap puis le fil demandé par un lien validé. Le rattrapage SSE/polling reste actif : l’absence de second bootstrap ne supprime pas les lectures nécessaires des conversations et fils. Les brouillons du compositeur restent présents pendant une vérification du même compte.

Un contexte d’accès absent/expiré, un refus, une panne ou une réponse invalide produit un reçu d’indisponibilité explicite. L’hydratation reprend via la route navigateur existante. Le rendu serveur ne renouvelle pas de cookie et ne transforme pas un échec en liste vide confirmée. Chaque navigation serveur fournit une nouvelle clé opaque de cycle client.

Le `loading.tsx` local garde un statut annoncé et des surfaces statiques sans animation ni dépendance UI non publiée. Les nouvelles entrées serveur gardent le seuil de 60 % de lignes par fichier ; le choix de l’environnement ne crée aucune exemption. Les mesures de performance et leur recette sont consignées séparément.
