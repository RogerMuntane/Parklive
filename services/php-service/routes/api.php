<?php

/**
 * Llistat de rutes de l'API de PHP.
 * Aquest fitxer conté la configuració dels endpoints, mètodes permesos i el seu controlador corresponent.
 */

return [
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
