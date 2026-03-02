<?php

require_once __DIR__ . "/../models/loginModel.php";
require_once __DIR__ . "/../models/sessionModel.php";
require_once __DIR__ . "/../middleware/AuthMiddleware.php";

class Login
{
    private $model;

    public function __construct()
    {
        // Verificar que l'usuari NO estigui ja autenticat
        AuthMiddleware::verificarNoAutenticat();

        $this->model = new LoginModel();

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->processarFormulari();
        }
    }

    private function processarFormulari()
    {
        $email = isset($_POST['mail']) ? trim($_POST['mail']) : '';
        $contrasenya = isset($_POST['contrasenya']) ? $_POST['contrasenya'] : '';

        $usuari = $this->model->autenticar($email, $contrasenya);

        if (!$usuari) {
            SessionModel::iniciarSessio();
            $_SESSION['errors'] = $this->model->getErrors();
            header('Location: ../views/login.php');
            exit();
        }

        // Guardar l'usuari a la sessió utilitzant el SessionModel
        SessionModel::guardarUsuari($usuari);
        SessionModel::setFlashMessage('success', 'Sessió iniciada correctament');

        // Comprovar si hi ha una URL de redirecció guardada
        SessionModel::iniciarSessio();
        $redirectUrl = isset($_SESSION['redirect_after_login'])
            ? $_SESSION['redirect_after_login']
            : '../views/protected_example.php';

        // Eliminar la URL de redirecció
        unset($_SESSION['redirect_after_login']);

        // Redirigir
        header('Location: ' . $redirectUrl);
        exit();
    }
}

if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new Login();
}
