# Informe de Contingut: Estat d'Implementació del Projecte ParkLive

Aquest document presenta l'estat d'implementació del projecte ParkLive, basant-se en l'anàlisi exhaustiva de la documentació tècnica, funcional i de disseny (Fase d'Anàlisi i Fase de Disseny), i establint una comparativa directa amb l'estat actual del codi font i l'estructura del repositori.

## 1. Contingut Textual i Pàgines Principals

### Funcionalitats Implementades
- **Pàgina d'inici**: S'ha desenvolupat la pàgina principal (`index.html`), la qual inclou la presentació de l'aplicació, el motor de cerca i el mapa interactiu.
- **Descripcions d'aparcaments**: S'han creat les fitxes individuals per a cada aparcament (`detall_Aparcament.html`), detallant tarifes, horaris i característiques, recolzades pel controlador corresponent (`aparcament_controller.py`).
- **Articles i Blog**: La secció editorial dedicada a notícies i mobilitat urbana ha estat implementada amb èxit (`blog.html`, `blog-detall.html`) juntament amb el seu controlador al backend.
- **Polítiques Legals i Normativa**: Els documents legals de compliment obligatori s'han incorporat a l'estructura (`avis_legal.html`, `politica_privacitat.html`, `politica_cookies.html` i `termes_condicions.html`).
- **Preguntes Freqüents (FAQ)**: S'ha establert la secció d'ajuda bàsica mitjançant l'arxiu `faq.html`.
- **Sobre ParkLive**: La informació corporativa del projecte ha estat reflectida a la pàgina `sobre-parklive.html`.
- **Gestió d'Usuaris i Autenticació**: El control d'accés, el registre i la gestió de perfils operen correctament a través de diverses pàgines (`login.html`, `register.html`, `reset-password.html`, `perfil.html` i `dashboard.html`), amb el suport dels serveis híbrids de PHP i Python.

### Funcionalitats Pendents de Desenvolupament
- **Tutorials i Guies d'Ús**: Malgrat la seva especificació a la documentació editorial com a secció dedicada (`/ajuda/tutorials`), actualment no es disposa d'aquests recursos documentals integrats a la plataforma.
- **Documentació Tècnica Pública (API Docs)**: D'acord amb la fase d'anàlisi, resta pendent l'exposició pública d'una documentació tècnica de l'API dirigida a desenvolupadors externs i operadors.

## 2. Contingut Interactiu i Funcionalitats Tècniques

### Funcionalitats Implementades
- **Mapes Dinàmics**: S'ha integrat de manera satisfactòria la cerca i visualització d'aparcaments basada en geolocalització.
- **Sistema de Valoracions i Ressenyes**: Es disposa de la funcionalitat completa perquè els usuaris puguin emetre avaluacions sobre els aparcaments utilitzats (`nova_Valoracio.html`, `valoracio_controller.py`).
- **Interfície per a Reportar Disponibilitat**: El nucli del model col·laboratiu ha estat implementat, permetent als usuaris notificar l'estat d'ocupació dels aparcaments (`report_disponibilitat.html`).
- **Reserves i Gestió de Pagaments**: El flux transaccional ha estat completat, cobrint des de la sol·licitud fins a la generació del comprovant de reserva (`reserva_Aparcament.html`, `tiquet_Aparcament.html`), incloent la integració amb l'API de Stripe per al processament de pagaments.
- **Sistema de Punts i Recompenses**: La base lògica per a la gestió de les contribucions dels usuaris (`contribucions_controller.py`) està operativa al backend.

### Funcionalitats Pendents de Desenvolupament
- **Simulador de Costos**: L'eina interactiva dissenyada per permetre als usuaris estimar la despesa de la seva estada abans de procedir a la reserva no es troba integrada com a mòdul independent a la interfície actual.
- **Comparador d'Opcions**: Falta la implementació de la interfície destinada a la comparativa simultània de diferents aparcaments segons criteris com distància i preu.
- **Enquestes i Formularis de Feedback**: El mecanisme estructurat per a la recollida d'opinions de satisfacció sobre l'experiència d'usuari no està present, més enllà del formulari de contacte genèric.
- **Gamificació Visual**: Tot i disposar d'un sistema intern de puntuació, no s'ha traslladat a la interfície d'usuari el sistema avançat d'insígnies (badges) i nivells visuals descrit als documents de disseny.

## 3. Contingut Multimèdia i Comunicació

### Funcionalitats Implementades
- **Notificacions Transaccionals**: El sistema de correus automatitzats (recuperació de contrasenyes, gestió d'usuaris) es troba operatiu.
- **Processament d'Imatges**: S'ha implementat un sistema òptim per a l'emmagatzematge i la compressió d'imatges al núvol (mitjançant Cloudinary i Pillow), complint amb els requisits de rendiment i accessibilitat web.
- **Contacte i Suport**: S'ha habilitat l'accés directe al suport mitjançant el formulari corresponent (`contacte.html`).

### Funcionalitats Pendents de Desenvolupament
- **Vídeos Tutorials**: No s'ha realitzat la producció i integració del contingut audiovisual (vídeos demostratius d'1 a 3 minuts) estipulat per guiar l'usuari en els processos de registre i reserva.
- **Notificacions In-App en Temps Real (Push Notifications)**: Malgrat que l'estat de la disponibilitat es calcula en temps real, no s'ha observat una arquitectura basada en notificacions Push o WebSockets integrada a la interfície del client.

## 4. Arquitectura i Infraestructura de Sistemes

### Funcionalitats Implementades
L'arquitectura tècnica s'alinea fidelment amb les especificacions definides a la Fase de Disseny:
- **Arquitectura Backend Híbrida**: Ús de Python (Flask) com a motor principal per a la lògica de negoci i rutes de l'API, combinat amb PHP com a servei especialitzat per a processos d'autenticació.
- **Sistemes de Base de Dades**: Implementació i gestió mitjançant MySQL.
- **Servidor Web**: Ús de Nginx per a la distribució del contingut i l'encaminament del proxy invers.
- **Orquestració i Virtualització**: Gestió íntegra del sistema mitjançant contenidors Docker i `docker-compose`, assegurant la compatibilitat i portabilitat de l'entorn de producció, d'acord amb els requisits de desplegament sobre Proxmox o entorns locals.

---

**Resum de l'Estat del Projecte**: ParkLive ha assolit el desenvolupament i implementació de la totalitat de les funcions estructurals i crítiques (Autenticació, Gestió de Mapes, Transaccions i Reserves, Ressenyes i Sistema Col·laboratiu de Disponibilitat). Els elements pendents d'execució pertanyen majoritàriament a capes addicionals de valor afegit orientades a enriquir l'experiència de l'usuari (simuladors, comparadors i material educatiu multimèdia).
