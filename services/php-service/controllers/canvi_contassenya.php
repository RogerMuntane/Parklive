<?php
session_start();
require_once "../models/canviContrasenyaModel.php";

class CanviContrasenya
{
    private $model;

    public function __construct()
    {
        // Verificar que l'usuari està autenticat
        if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
            header('Location: ../views/login.php');
            exit();
        }

        $this->model = new CanviContrasenyaModel();

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->processarFormulari();
        }
    }

    /**
     * Processa el formulari de canvi de contrasenya
     */
    private function processarFormulari()
    {
        $usuariId = $_SESSION['user']['id'];
        $email = isset($_POST['email']) ? trim($_POST['email']) : '';
        $contrasenyaActual = isset($_POST['contrasenya_actual']) ? $_POST['contrasenya_actual'] : '';
        $contrasenyaNova = isset($_POST['contrasenya_nova']) ? $_POST['contrasenya_nova'] : '';
        $contrasenyaConfirmar = isset($_POST['contrasenya_confirmar']) ? $_POST['contrasenya_confirmar'] : '';

        // Realitzar canvi de contrasenya
        if ($this->model->canviarContrasenya($usuariId, $email, $contrasenyaActual, $contrasenyaNova, $contrasenyaConfirmar)) {
            // Èxit: destruir sessió i redirigir a login
            $_SESSION['success_message'] = "Contrasenya canviada correctament. Inicia sessió de nou.";
            session_destroy();
            header('Location: ../views/login.php');
            exit();
        } else {
            // Error: emmagatzemar errors i redirigir a la vista
            $_SESSION['errors'] = $this->model->getErrors();
            header('Location: ../views/canvi_contrasenya.php');
            exit();
        }
    }
}

// Executar el controlador si l'accés és directe
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new CanviContrasenya();
}
