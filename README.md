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
- **Cloudinary API**: Optimització automàtica d'imatges (WebP, qualitat auto). S'utilitza com a motor principal de transformació amb sistema de fallback local via Pillow.
- **Servidor SMTP**: Servei per a l'enviament de correus electrònics (recuperació de contrasenyes).

## Arquitectura del Projecte

El projecte segueix una arquitectura de microserveis on cada servei implementa el seu propi patró MVC:

```
parklive/
├── services/
│   ├── python-service/          # Servei backend Python (API REST)
│   │   ├── models/              # Models de dades i lògica de negoci
│   │   ├── controllers/         # Controladors de la lògica de negoci
│   │   ├── routes/              # Definicions de les rutes de l'API
│   │   ├── middleware/          # Middlewares d'autenticació i validació
│   │   ├── scripts/             # Tasques programades (cron)
│   │   ├── utils/               # Utilitats internes del servei
│   │   ├── views/               # Plantilles i generació de documents
│   │   ├── tests/               # Tests unitaris i d'integració
│   │   ├── requirements.txt     # Dependències Python
│   │   └── Dockerfile           # Contenidor Docker
│   │
│   ├── php-service/             # Servei backend PHP (API REST)
│   │   ├── models/              # Models de dades i accés a BD
│   │   ├── controllers/         # Controladors de processos d'auth i legacy
│   │   ├── routes/              # Configuració de rutes del servei
│   │   ├── composer.json        # Dependències PHP
│   │   └── Dockerfile           # Contenidor Docker
│   │
│   └── frontend-service/        # Servei Frontend (Nginx + JS)
│       ├── src/                 # Codi font (JS, SASS)
│       ├── public/              # Recursos estàtics i HTML
│       └── Dockerfile           # Contenidor Docker
│
├── shared/                      # Recursos compartits entre serveis
│   ├── constants/               # Constants globals
│   ├── types/                   # Definicions de tipus compartits
│   └── serializers.py           # Serialitzadors de dades compartits
│
├── storage/                     # Emmagatzematge persistent de fitxers (Volum Docker)
│   ├── tickets/                 # Tiquets de reserva generats en PDF
│   ├── aparcaments/             # Imatges optimitzades dels aparcaments (WebP)
│   ├── blog/                    # Imatges del blog i contingut multimèdia
│   └── profiles/                # Fotos de perfil dels usuaris
│
├── logs/                        # Registres d'execució i errors de processament
│
├── database/                    # Scripts i configuració de base de dades
│   ├── migrations/              # Migracions de BD (SQL incrementals)
│   ├── seeds/                   # Dades de prova
│   ├── schemas/                 # Esquemes de BD
│   ├── procedures/              # Procediments emmagatzemats MySQL
│   ├── models/                  # Models SQL de referència
│   ├── backup/                  # Còpies de seguretat de la BD
│   ├── init-db-container.sh     # Script d'inicialització executat per Docker
│   └── setup.sh                 # Script d'inicialització manual
│
├── docker-compose.yml           # Orquestració de contenidors
├── .env.example                 # Exemple de variables d'entorn
└── README.md                    # Aquest fitxer
```

## Instal·lació i Configuració

### Prerequisits
- Docker i Docker Compose
- Git

### ⚠️ Nota: Xarxa del Thos i Codina (DNS Institucional)

Si fas el `docker-compose build` connectat a la **xarxa del Thos i Codina**, és possible que el DNS institucional bloquegi la resolució de noms durant la instal·lació de paquets (pip, apt, composer), causant errors del tipus:

```
Could not resolve host: pypi.org
ERROR: Could not find a version that satisfies the requirement ...
```

**Solució:** Sobrescriu temporalment el DNS de Docker abans de fer el build:

```bash
# Opció 1: Afegir DNS públics globalment al daemon de Docker
# Edita (o crea) /etc/docker/daemon.json i afegeix:
sudo bash -c 'cat > /etc/docker/daemon.json <<EOF
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF'
sudo systemctl restart docker
```

```bash
# Opció 2 (alternativa ràpida, sense reiniciar Docker):
# Fes el build passant el DNS directament
DOCKER_BUILDKIT=0 docker-compose build --build-arg BUILDKIT_INLINE_CACHE=0
# O bé usa la xarxa de l'host durant el build (ja configurat al docker-compose.yml):
# network: host  ← ja present als serveis python-service i cron-service
```

> Els serveis `python-service` i `cron-service` ja inclouen `network: host` al context de build i DNS `8.8.8.8` / `1.1.1.1` en temps d'execució per mitigar aquest problema.

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

4. **Migracions i seeds (BD):**
   ```bash
   # Les migracions i seeds s'executen automàticament quan el contenidor
   # 'mysql' s'inicia per primera vegada, via init-db-container.sh.
   # Per re-inicialitzar manualment la BD (⚠️ esborra dades existents):
   docker-compose down -v
   docker-compose up -d
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
- **Frontend**: http://localhost:3000
- **Python API**: http://localhost:5000
- **PHP API**: http://localhost:8080
- **phpMyAdmin**: http://localhost:8081

## Contacte
**Autors**:
- Roger Muntané - [@RogerMuntane](https://github.com/RogerMuntane)
- Xavier Ruiz - [@Emperor-Xizzle](https://github.com/Emperor-Xizzle)

**Última actualització**: 2026-05-15
