<?php
session_start();

require_once "../models/ResetPasswordModel.php";

class CanviContrasenya
{
    private $model;
    private $wantsJson = false;

    public function __construct()
    {
        $this->model = new ResetPasswordModel();

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

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->processarFormulari();
        }
    }

    private function respondJson($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit();
    }

    /**
     * Processa el formulari de canvi de contrasenya
     */
    private function processarFormulari()
    {

        $email = isset($_POST['email']) ? trim($_POST['email']) : '';
        $contrasenyaNova = isset($_POST['contrasenya_nova']) ? $_POST['contrasenya_nova'] : '';
        $contrasenyaConfirmar = isset($_POST['contrasenya_confirmar']) ? $_POST['contrasenya_confirmar'] : '';

        if (!$email) {
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
            exit();
        }

        // Validar que s'ha verificat el codi
        $resetData = isset($_SESSION['password_reset']) ? $_SESSION['password_reset'] : null;
        if (!$resetData || !$resetData['verified']) {
            $_SESSION['errors'] = array('No s\'ha verificat el codi de reset.');
            header('Location: ../views/request_reset_code.php');
            exit();
        }

        // Realitzar canvi de contrasenya
        if ($this->model->canviarContrasenyaReset($email, $contrasenyaNova, $contrasenyaConfirmar)) {
            // Marcar el codi com a usat
            $this->model->marcarCodiComUsat($resetData['verification_id'] ?? null);

            // Èxit: destruir sessió i redirigir a login
            $_SESSION['success_message'] = "Contrasenya canviada correctament. Inicia sessió de nou.";
            unset($_SESSION['password_reset']);
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
