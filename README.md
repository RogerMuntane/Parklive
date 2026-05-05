# Parklive - Sistema de Gestió d'Aparcaments

## Descripció
Parklive és un sistema complet de gestió d'aparcaments que implementa una arquitectura de microserveis amb el patró MVC (Model-Vista-Controlador). El projecte està dissenyat per ser escalable, modular i fàcil de mantenir, integrant pagaments segurs i autenticació de tercers.

## Stack Tecnològic i Llibreries

### Backend (Microserveis)
- **Python Service (Flask)**: Core API per a la gestió de reserves, usuaris i estadístiques.
  - `Flask`: Framework web.
  - `Stripe`: Integració de pagaments i subscripcions.
  - `PyJWT`: Gestió de tokens d'autenticació.
  - `Bcrypt`: Encriptació de contrasenyes.
  - `MySQL Connector`: Connexió amb la base de dades.
  - `ReportLab`: Generació de tiquets i factures en PDF.
  - `Cloudinary`: Optimització d'imatges al núvol.
  - `Pillow`: Processament i optimització d'imatges local (fallback).
- **PHP Service**: Servei especialitzat en autenticació i processos legacy.
  - `Firebase PHP-JWT`: Validació de tokens.
  - `Stripe PHP`: Gestió de clients i pagaments.

### Frontend
- **HTML5 / CSS3 / JavaScript (ES6+)**: Interfície d'usuari dinàmica i reactiva.
- **Bootstrap 5**: Framework de disseny responsive.
- **SASS**: Preprocessador de CSS per a una gestió d'estils modular.
- **ApexCharts**: Visualització de dades i estadístiques per a usuaris Premium.
- **Flatpickr**: Selector de dates avançat per a reserves.

### Infraestructura
- **Docker & Docker Compose**: Contenidorització de tots els serveis.
- **MySQL**: Base de dades relacional.
- **Nginx**: Servidor web per al frontend.

## APIs i Serveis Externs
- **Stripe API**: Pasarel·la de pagament per a reserves puntuals i subscripcions Premium. S'utilitzen *Stripe Elements*, *SetupIntents* i *Webhooks*.
- **Google OAuth 2.0**: Autenticació d'usuaris mitjançant Google Identity Services.
- **Cloudinary API**: Optimització automàtica d'imatges (WebP, qualitat auto). S'utilitza com a motor principal de transformació amb un sistema de **fallback local (Pillow)** per garantir el funcionament en cas de fallada de xarxa.
- **Servidor SMTP**: Servei per a l'enviament de correus electrònics (recuperació de contrasenyes).
## Arquitectura del Projecte

El projecte segueix una arquitectura de microserveis on cada servei implementa el seu propi patró MVC:

```
parklive/
├── services/
│   ├── python-service/          # Servei backend Python (API REST)
│   │   ├── models/              # Models de dades i lògica de negoci
│   │   ├── controllers/         # Controladors i lògica de rutes
│   │   ├── scripts/             # Tasques programades (Crons de pagaments i subscripcions)
│   │   ├── config/              # Configuració del servei
│   │   ├── requirements.txt     # Dependències Python
│   │   └── Dockerfile           # Contenidor Docker
│   │
│   ├── php-service/             # Servei backend PHP (API REST)
│   │   ├── models/              # Models de dades i accés a BD
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
├── storage/                     # Emmagatzematge persistent de fitxers
│   ├── tickets/                 # Tiquets de reserva generats en PDF
│   └── aparcaments/             # Imatges optimitzades dels aparcaments (WebP)
│
├── logs/                        # Registres d'execució i errors de processament
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

## Instal·lació i Configuració

### Prerequisits
- Docker i Docker Compose
- Git

### Passos d'Instal·lació

1. **Clonar el repositori:**
   ```bash
   git clone https://github.com/RogerMuntane/Parklive.git
   cd Parklive
   ```

2. **Configurar variables d'entorn:**
   ```bash
   cp .env.example .env
   # Editar .env amb les claus de Stripe, Google OAuth, credencials de la BD i el servidor SMTP
   ```

3. **Construir i iniciar els contenidors:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Executar migracions i seeds:**
   ```bash
   # Les migracions s'executen automàticament en iniciar el contenidor db, 
   # però pots forçar la càrrega de dades:
   docker-compose exec python-service python manage.py seed
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
- **phpMyAdmin**: http://localhost:8081

## Contacte
**Autors**:
- Roger Muntané - [@RogerMuntane](https://github.com/RogerMuntane)
- Xavier Ruiz - [@Emperor-Xizzle](https://github.com/Emperor-Xizzle)

**Última actualització**: 2026-05-05
