# Mise en page réelle de Messages

La suite monte la vraie page avec `react-dom/client`, ses hooks, les composants UI publiés et la feuille du consommateur. Les vrais relais frontend communiquent via `FrontNetwork` avec les mocks contractuels existants. Elle vérifie les propriétés du shell, les commandes de sidebar, le tiroir, la carte et ses conteneurs, les zones de défilement préparées, le changement réel de panneau et le refus initial avec sa commande de reprise explicite.

Le frame ne déclare pas overflow : JSDOM omet cette valeur calculée initiale. Seule une valeur vide est normalisée vers l’état initial `visible` ; les valeurs explicites `hidden`, `clip` ou `auto` restent refusées. Les ombres sont vérifiées par leurs longueurs et couleurs normalisées, en acceptant les notations/ordres de couleur équivalents.

Deux politiques CSSOM conservent les associations média/sélecteur, colonnes desktop, panneaux sur petit écran, espacement mobile, petits textes partagés, protection de hauteur du header/footer et outlines. JSDOM ne compile pas Tailwind, n’évalue pas les médias et ne mesure ni géométrie, défilement natif, ni visibilité des ombres externes. Les recettes navigateur sur main intégré et local-current actualisé restent distinctes.

Deux exceptions de fixtures déjà présentes restent explicites : le modèle de réponse GET d’un fil est inversé dans le contrat publié, et le refus bootstrap503 existant n’y figure pas parmi les statuts. Les fixtures canoniques de `messages-page.contract-mocks.test.cjs` sont réutilisées ; aucune validation stricte de ces deux réponses par ce schéma n’est revendiquée. Les autres réponses et opérations restent contrôlées. Les actions de présentation n’émettent que des GET, sans acquittement automatique. Sources API/BFF et contrats inchangés.

JSDOM30.1.1 est une dépendance de développement uniquement. Utiliser un runtime compatible, par exemple Node24.19.0 ; la CI utilise24.21.0. La fermeture publique exacte vérifiée reprend celle du lock Calendar intégré, sans changer aucune ancienne entrée du lock Messages ni dépendance de production. Une installation fraîche dans la CI Messages reste nécessaire.
