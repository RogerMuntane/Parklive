<?php

// ====================================================================
// CORS Configuration – Robusta per a entorns Docker
// ====================================================================
// Permet requests cross-origin del frontend (localhost:3000)
// als ports 8080 (PHP) i 5000 (Python Flask)

$corsOrigin = null;

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];

    // 1. Intenta llegir ALLOWED_ORIGINS de .env (via $_ENV o getenv)
    $envOrigins = getenv('ALLOWED_ORIGINS');
    if ($envOrigins) {
        $allowedOrigins = array_filter(array_map('trim', explode(',', $envOrigins)));
        if (in_array($origin, $allowedOrigins, true)) {
            $corsOrigin = $origin;
        }
    }

    // 2. Fallback segur: localhost en dev (si no estem en production)
    if (!$corsOrigin && getenv('APP_ENV') !== 'production') {
        // Permet qualsevol localhost (localhost:3000, 127.0.0.1:3000, etc.)
        if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
            $corsOrigin = $origin;
        }
    }

    // 3. Enviar headers si l'origen és permès
    if ($corsOrigin) {
        header("Access-Control-Allow-Origin: $corsOrigin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN, Accept");
        header("Access-Control-Max-Age: 86400");
    }
}

// CORS pre-flight (OPTIONS requests)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Retornar JSON sempre
header('Content-Type: application/json');

// Parse route
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Elimina prefix si l'app està en una subcarpeta
$route = trim($requestUri, '/');

// Rutes definides (Carregades des de fitxer extern)
$routes = require_once __DIR__ . '/routes/api.php';

// Comprovar si existeix la ruta
if (isset($routes[$route])) {
    if (isset($routes[$route][$method])) {
        $handler = $routes[$route][$method];
        require_once __DIR__ . '/' . $handler['file'];

        // Ara la instanciem
        $className = $handler['class'];
        $controller = new $className();

        // Si hem definit una acció específica, cridem-la,
        // sinó el constructor ho està fent (antic comportament).
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
