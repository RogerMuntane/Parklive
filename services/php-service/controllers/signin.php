<?php
session_start();
require_once __DIR__ . "/../models/validarUsuari.php";
require_once __DIR__ . "/../models/guardarUsuari.php";

class Signin
{
    private $validador;
    private $guardador;
    private $errors = array();
    private $success = false;
    private $wantsJson = false;

    public function __construct()
    {
        $this->validador = new validarUsuari();
        $this->guardador = new guardarUsuari();

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
        // Obtenir dades del formulari
        $nom = isset($_POST['name']) ? trim($_POST['name']) : '';
        $cognom = isset($_POST['cognom']) ? trim($_POST['cognom']) : '';
        $email = isset($_POST['mail']) ? trim($_POST['mail']) : '';
        $contrasenya = isset($_POST['contrasenya']) ? $_POST['contrasenya'] : '';
        $contrasenya_confirmar = isset($_POST['contrasenya_confirmar']) ? $_POST['contrasenya_confirmar'] : '';
        $telefono = isset($_POST['telefon']) ? trim($_POST['telefon']) : '';

        // Validar totes les dades
        if ($this->validador->validarTots($nom, $cognom, $email, $contrasenya, $contrasenya_confirmar, $telefono)) {
            // Si la validació és correcta, guardar l'usuari
            if ($this->guardador->guardarUsuari($nom, $cognom, $email, $contrasenya, $telefono)) {
                $this->success = true;

                if ($this->wantsJson) {
                    $this->respondJson([
                        'success' => true,
                        'message' => 'Usuari registrat correctament!'
                    ], 201);
                }

                $_SESSION['success_message'] = "Usuari registrat correctament!";
                header('Location: ../views/signin.php?success=true');
                exit();
            } else {
                $this->errors = $this->guardador->getErrors();
            }
        } else {
            $this->errors = $this->validador->getErrors();
        }

        // Resposta JSON amb errors per a peticions AJAX
        if ($this->wantsJson) {
            $this->respondJson([
                'success' => false,
                'error' => implode(', ', $this->errors),
                'errors' => $this->errors
            ], 422);
        }

        // Guardar errors en sessió per mostrar-los
        $_SESSION['errors'] = $this->errors;

        // Tornar a la vista de login per mostrar els errors
        header('Location: ../views/signin.php');
        exit();
    }

    public function obtenirErrors()
    {
        return $this->errors;
    }

    public function esExitosa()
    {
        return $this->success;
    }
}

// Instanciar el controlador solo si se accede directamente a este archivo
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    $con = new Signin();
}
