<?php

/**
 * Punt d'entrada principal de l'API PHP.
 * Gestiona la configuració de CORS, l'encaminament (routing) de peticions i la instanciació de controladors.
 * 
 * Aquest fitxer actua com un Front Controller, centralitzant tota la lògica d'entrada.
 */

// ====================================================================
// CORS Configuration – Robusta per a entorns Docker
// ====================================================================
// Permet requests cross-origin del frontend (localhost:3000)
// als ports 8080 (PHP) i 5000 (Python Flask)

$corsOrigin = null;

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];

    /**
     * 1. Intenta llegir ALLOWED_ORIGINS de .env (via $_ENV o getenv)
     */
    $envOrigins = getenv('ALLOWED_ORIGINS');
    if ($envOrigins) {
        $allowedOrigins = array_filter(array_map('trim', explode(',', $envOrigins)));
        if (in_array($origin, $allowedOrigins, true)) {
            $corsOrigin = $origin;
        }
    }

    /**
     * 2. Fallback segur: localhost en dev (si no estem en production)
     */
    if (!$corsOrigin && getenv('APP_ENV') !== 'production') {
        // Permet qualsevol localhost (localhost:3000, 127.0.0.1:3000, etc.)
        if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
            $corsOrigin = $origin;
        }
    }

    /**
     * 3. Enviar headers si l'origen és permès
     */
    if ($corsOrigin) {
        header("Access-Control-Allow-Origin: $corsOrigin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN, Accept");
        header("Access-Control-Max-Age: 86400");
    }
}

/**
 * Gestió de peticions OPTIONS (CORS pre-flight).
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Configura la resposta per defecte com a JSON.
 */
header('Content-Type: application/json');

/**
 * Parseig de la URL per determinar la ruta sol·licitada.
 */
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Elimina prefix si l'app està en una subcarpeta
$route = trim($requestUri, '/');

/**
 * Carrega el mapa de rutes definit a api.php.
 */
$routes = require_once __DIR__ . '/routes/api.php';

/**
 * Lògica d'encaminament: cerca la ruta i el mètode HTTP en el mapa de rutes.
 */
if (isset($routes[$route])) {
    if (isset($routes[$route][$method])) {
        $handler = $routes[$route][$method];
        require_once __DIR__ . '/' . $handler['file'];

        // Instanciació dinàmica del controlador
        $className = $handler['class'];
        $controller = new $className();

        // Execució de l'acció (mètode) si està definida
        if (isset($handler['action']) && method_exists($controller, $handler['action'])) {
            $action = $handler['action'];
            $controller->$action();
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Not Found']);
}

