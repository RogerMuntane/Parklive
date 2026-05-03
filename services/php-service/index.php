<?php

// CORS dinàmic per a desenvolupament
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    // Permetre localhost en diversos ports comuns de dev
    if (preg_match('/^http:\/\/localhost(:\d+)?$/', $origin) || preg_match('/^http:\/\/127\.0\.0\.1(:\d+)?$/', $origin)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-ID, X-CSRF-TOKEN");
    }
}

// CORS pre-flight en PHP per si Apache falla
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

// Rutes definides
$routes = [
    'api/login' => [
        'POST' => [
            'file' => 'controllers/login.php',
            'class' => 'Login',
            'action' => 'processLogin'
        ]
    ],
    'api/auth/google' => [
        'POST' => [
            'file' => 'controllers/google_auth.php',
            'class' => 'GoogleAuth',
            'action' => 'processLogin'
        ]
    ],
    'api/signin' => [
        'POST' => [
            'file' => 'controllers/signin.php',
            'class' => 'Signin',
            'action' => 'processSignin'
        ]
    ],
    'api/logout' => [
        'POST' => [
            'file' => 'controllers/logout.php',
            'class' => 'Logout',
            'action' => 'processLogout'
        ]
    ],
    'api/profile' => [
        'GET' => [
            'file' => 'controllers/get_profile_info.php',
            'class' => 'GetProfileInfoController',
            'action' => 'processRequest'
        ],
        'POST' => [
            'file' => 'controllers/update_profile_info.php',
            'class' => 'UpdateProfileInfoController',
            'action' => 'processRequest'
        ],
        'PUT' => [ // Alternativa pel POST
            'file' => 'controllers/update_profile_info.php',
            'class' => 'UpdateProfileInfoController',
            'action' => 'processRequest'
        ]
    ],
    'api/profile/picture' => [
        'POST' => [
            'file' => 'controllers/update_profile_picture.php',
            'class' => 'UpdateProfilePictureController',
            'action' => 'processRequest'
        ]
    ],
    'api/profile/password' => [
        'POST' => [
            'file' => 'controllers/canvi_contrasenya_perfil.php',
            'class' => 'CanviContrasenyaPerfilController',
            'action' => 'processRequest'
        ],
        'PUT' => [
            'file' => 'controllers/canvi_contrasenya_perfil.php',
            'class' => 'CanviContrasenyaPerfilController',
            'action' => 'processRequest'
        ]
    ],
    'api/admin/users' => [
        'GET' => [
            'file' => 'controllers/AdminUserController.php',
            'class' => 'AdminUserController',
            'action' => 'processRequest'
        ],
        'POST' => [
            'file' => 'controllers/AdminUserController.php',
            'class' => 'AdminUserController',
            'action' => 'processRequest'
        ]
    ]
];

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
