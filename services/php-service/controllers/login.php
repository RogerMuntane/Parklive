<?php
session_start();
require_once "../models/loginModel.php";

class Login
{
    private $model;

    public function __construct()
    {
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
            $_SESSION['errors'] = $this->model->getErrors();
            header('Location: ../views/login.php');
            exit();
        }

        $_SESSION['user'] = array(
            'id' => $usuari['id'],
            'nom' => $usuari['nom'],
            'cognom' => $usuari['cognom'],
            'email' => $usuari['email']
        );

        $_SESSION['success_message'] = "Sessió iniciada correctament";

        header('Location: ../views/login.php?success=true');
        exit();
    }
}

if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new Login();
}
