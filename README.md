## Contrats de données

[BFF.md](BFF.md) décrit les routes et données nécessaires au front ; [BACKEND.md](BACKEND.md) liste les tables et routes backend correspondantes. Les contrats communs sont harmonisés entre les dix Web Services et distinguent l'existant des propositions.

# Messages

The **Messages** module of the project — responsible for managing the messages of the Mairie 360 application.

## Dépendances et audit de sécurité

Les `overrides` de `package.json` alignent la copie de Next.js apportée par
`lib-components` sur la version de l'application (`$next`). Ils imposent aussi
PostCSS `>=8.5.23 <9` et Sharp `>=0.35.4 <0.36` à Next.js pour corriger les
alertes de sécurité de ses dépendances. Conserver ces règles tant que les
versions déclarées par les packages amont restent vulnérables.

Après une mise à jour, vérifier le fichier de verrouillage avec `npm ci`, puis
exécuter `npm audit --audit-level=high`, `npm run lint` et `npm run build`.

## 🚀 Getting Started

This project is fully containerized for development. You’ll only need **Docker** and **Docker Compose** installed.

### 🐳 Run in Development Mode (with Hot Reload)

1. Make sure Docker and Docker Compose are installed.
2. Start the development environment:

```bash
docker compose up --build --watch
```

1. Open your browser at [http://development.mairie360.fr](http://development.mairie360.fr) to access the application.

Changes to your code will automatically trigger a refresh or the rebuild of the affected services.
