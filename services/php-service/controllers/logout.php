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

        // Guardar missatge de confirmació abans de destruir la sessió
        $missatge = 'Sessió tancada correctament';

        // Tancar la sessió
        SessionModel::tancarSessio();

        // Iniciar una nova sessió per mostrar el missatge
        SessionModel::iniciarSessio();
        SessionModel::setFlashMessage('success', $missatge);

        // Redirigir al login
        header('Location: ../views/login.php'); //Canviar quan es fagi el frontend
        exit();
    }
}

// Executar el controlador si s'accedeix directament
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new Logout();
}
