<?php

require_once __DIR__ . '/../models/sessionModel.php';

/**
 * Controlador per tancar la sessió de l'usuari
 */
class Logout
{
    public function __construct()
    {
        $this->tancarSessio();
    }

    private function tancarSessio()
    {
        // Iniciar sessió per poder-la destruir
        SessionModel::iniciarSessio();
        // Tancar la sessió i eliminar la cookie
        SessionModel::tancarSessio();
        // Retornar resposta JSON d'èxit
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Sessió tancada correctament']);
        exit();
    }
}

// Executar el controlador si s'accedeix directament
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new Logout();
}
