# Parklive - Sistema de Gestió d'Aparcaments

## Descripció
Parklive és un sistema complet de gestió d'aparcaments que implementa una arquitectura de microserveis amb el patró MVC (Model-Vista-Controlador). El projecte està dissenyat per ser escalable, modular i fàcil de mantenir.

## Arquitectura del Projecte

El projecte segueix una arquitectura de microserveis amb Docker, on cada servei implementa el seu propi patró MVC:

```
parklive/
├── services/
│   ├── python-service/          # Servei backend Python (API REST)
│   │   ├── models/              # Models de dades i lògica de negoci
│   │   ├── views/               # Serialitzadors i formatadors de resposta
│   │   ├── controllers/         # Controladors i lògica de rutes
│   │   ├── config/              # Configuració del servei
│   │   ├── requirements.txt     # Dependències Python
│   │   └── Dockerfile           # Contenidor Docker
│   │
│   ├── php-service/             # Servei backend PHP (API REST)
│   │   ├── models/              # Models de dades i accés a BD
│   │   ├── views/               # Vistes JSON i resposta API
│   │   ├── controllers/         # Controladors PHP
│   │   ├── config/              # Configuració del servei
│   │   ├── composer.json        # Dependències PHP
│   │   └── Dockerfile           # Contenidor Docker
│   │
│   └── frontend-service/        # Servei Frontend
│       ├── src/
│       │   ├── assets/          
│       │   ├── js/           
│       │   └── sass/        
│       ├── public/              # Recursos estàtics
│       └── Dockerfile           # Contenidor Docker
│
├── shared/                      # Recursos compartits entre serveis
│   ├── utils/                   # Utilitats comunes
│   ├── middlewares/             # Middleware compartit
│   ├── validators/              # Validadors de dades
│   └── constants/               # Constants globals
│
├── database/                    # Scripts i configuració de base de dades
│   ├── migrations/              # Migracions de BD
│   ├── seeds/                   # Dades de prova
│   └── schemas/                 # Esquemes de BD
│
├── docker-compose.yml           # Orquestració de contenidors
├── .env.example                 # Exemple de variables d'entorn
└── README.md                    # Aquest fitxer
```



## Directori Shared

El directori `shared/` conté recursos comuns utilitzats per múltiples serveis:

- **utils/**: Funcions auxiliars reutilitzables
- **middlewares/**: Middleware d'autenticació, logging, CORS, etc.
- **validators/**: Esquemes de validació de dades
- **constants/**: Constants i configuracions globals

## Directori Database

El directori `database/` gestiona tot el relacionat amb la base de dades:

- **migrations/**: Control de versions de l'esquema de BD
- **seeds/**: Dades inicials per a desenvolupament i testing
- **schemas/**: Definicions d'esquemes i diagrames

## Instal·lació i Configuració

### Prerequisits
- Docker i Docker Compose
- Git

### Passos d'Instal·lació

1. **Clonar el repositori:**
   ```bash
   git clone https://github.com/RogerMuntane/Parklive.git
   cd Parklive
   git checkout restructure-mvc-docker
   ```

2. **Configurar variables d'entorn:**
   ```bash
   cp .env.example .env
   # Editar .env amb les teves configuracions
   ```

3. **Construir i iniciar els contenidors:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Executar migracions:**
   ```bash
   docker-compose exec python-service python manage.py migrate
   docker-compose exec php-service php artisan migrate
   ```

5. **Carregar dades de prova (opcional):**
   ```bash
   docker-compose exec python-service python manage.py seed
   docker-compose exec php-service php artisan db:seed
   ```

## Ús i Desenvolupament

### Executar els serveis
```bash
# Iniciar tots els serveis
docker-compose up -d

# Veure els logs
docker-compose logs -f

# Aturar els serveis
docker-compose down
```

### Accedir als serveis
- **Frontend**: http://localhost:3307
- **Python API**: http://localhost:5000
- **PHP API**: http://localhost:8080
- **Base de dades**: localhost:3306 (MySQL) phpMyAdmin:  localhost:8081

## Testing

### Executar tests
```bash
# Python Service
docker-compose exec python-service pytest

# PHP Service
docker-compose exec php-service php artisan test

# Frontend Service
docker-compose exec frontend-service npm test
```

## Contacte

**Autor**: Roger Muntané  
**GitHub**: [@RogerMuntane](https://github.com/RogerMuntane)


**Última actualització**: 2026-01-13
