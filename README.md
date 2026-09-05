## Contrats de données

[BFF.md](BFF.md) décrit les routes et données nécessaires au front ; [BACKEND.md](BACKEND.md) liste les tables et routes backend correspondantes. Les contrats communs sont harmonisés entre les dix Web Services et distinguent l'existant des propositions.

# Messages

The **Messages** module of the project — responsible for managing the messages of the Mairie 360 application.

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
