# Parklive

## Estructura del Proyecto / Project Structure

Este proyecto está organizado para soportar múltiples tecnologías: Python, PHP, HTML, SASS, JavaScript y Base de Datos.

### 📁 Estructura de Carpetas

```
Parklive/
├── backend/              # Backend del proyecto (Python/PHP)
│   ├── api/             # Endpoints de la API REST
│   ├── controllers/     # Controladores de la aplicación
│   ├── models/          # Modelos de datos
│   ├── middleware/      # Middleware de autenticación y validación
│   ├── utils/           # Funciones auxiliares
│   └── tests/           # Tests del backend
│
├── frontend/            # Frontend del proyecto
│   ├── public/          # Archivos públicos (HTML)
│   └── src/             # Código fuente del frontend
│       ├── js/          # JavaScript
│       ├── sass/        # SASS/SCSS
│       ├── components/  # Componentes reutilizables
│       └── assets/      # Recursos estáticos
│           ├── images/  # Imágenes
│           └── fonts/   # Fuentes
│
├── database/            # Base de datos
│   ├── migrations/      # Migraciones de base de datos
│   ├── seeds/           # Datos de prueba
│   └── models/          # Modelos de base de datos
│
├── config/              # Archivos de configuración
├── docs/                # Documentación del proyecto
└── logs/                # Archivos de logs (ignorados por git)
```

### 🛠️ Tecnologías Soportadas

- **Python**: Para el backend y procesamiento de datos
- **PHP**: Para servicios del backend y API
- **HTML**: Para la estructura de las páginas
- **SASS/SCSS**: Para los estilos (compilado a CSS)
- **JavaScript**: Para la interactividad del frontend
- **Base de Datos**: Estructura para migraciones y modelos

### 📝 Descripción de Carpetas

#### Backend
- **api/**: Define los endpoints REST de tu aplicación
- **controllers/**: Lógica de control de la aplicación
- **models/**: Definición de modelos de datos
- **middleware/**: Autenticación, autorización, validaciones
- **utils/**: Funciones helper y utilidades
- **tests/**: Tests unitarios e integración

#### Frontend
- **public/**: Archivos HTML accesibles directamente
- **src/js/**: Código JavaScript modular
- **src/sass/**: Estilos SASS que se compilan a CSS
- **src/components/**: Componentes UI reutilizables
- **src/assets/**: Recursos estáticos (imágenes, fuentes)

#### Database
- **migrations/**: Scripts de migración de esquema
- **seeds/**: Datos iniciales para desarrollo
- **models/**: Definición de esquemas de base de datos

#### Otros
- **config/**: Configuraciones de entorno y servicios
- **docs/**: Documentación técnica y de usuario
- **logs/**: Logs de aplicación (ignorados en git)

### 🚀 Próximos Pasos

1. Instalar dependencias necesarias
2. Configurar variables de entorno
3. Configurar la base de datos
4. Comenzar a desarrollar tu aplicación

---

*Esta estructura está diseñada para escalar y mantener un código organizado y mantenible.*