<?php

require_once __DIR__ . "/../models/loginModel.php";
require_once __DIR__ . "/../models/sessionModel.php";
require_once __DIR__ . "/../middleware/AuthMiddleware.php";

class Login
{
    private $model;
    private $wantsJson = false;

    public function __construct()
    {
        // Verificar que l'usuari NO estigui ja autenticat
        AuthMiddleware::verificarNoAutenticat();

        $this->model = new LoginModel();

        // Detectar si la petició ve del frontend (AJAX) i vol JSON
        $this->wantsJson = isset($_SERVER['HTTP_ACCEPT'])
            && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->processarFormulari();
        }
    }

    /**
     * Retorna una resposta JSON i atura l'execució.
     */
    private function respondJson($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit();
    }

    private function processarFormulari()
    {
        $email = isset($_POST['mail']) ? trim($_POST['mail']) : '';
        $contrasenya = isset($_POST['contrasenya']) ? $_POST['contrasenya'] : '';

        $usuari = $this->model->autenticar($email, $contrasenya);

        if (!$usuari) {
            if ($this->wantsJson) {
                $errors = $this->model->getErrors();
                $this->respondJson([
                    'success' => false,
                    'error' => implode(', ', $errors),
                    'errors' => $errors
                ], 401);
            }

            SessionModel::iniciarSessio();
            $_SESSION['errors'] = $this->model->getErrors();
            header('Location: ../views/login.php');
            exit();
        }

        // Guardar l'usuari a la sessió utilitzant el SessionModel
        SessionModel::guardarUsuari($usuari);
        SessionModel::setFlashMessage('success', 'Sessió iniciada correctament');

        if ($this->wantsJson) {
            $this->respondJson([
                'success' => true,
                'message' => 'Sessió iniciada correctament.',
                'user' => $usuari
            ]);
        }

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
