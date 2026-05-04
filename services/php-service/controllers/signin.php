<?php
require_once __DIR__ . "/../models/validarUsuari.php";
require_once __DIR__ . "/../models/guardarUsuari.php";

class Signin
{
    private $validador;
    private $guardador;

    public function __construct()
    {
        $this->validador = new validarUsuari();
        $this->guardador = new guardarUsuari();
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

    public function processSignin()
    {
        // Obtenir dades del formulari o de JSON
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, TRUE);

        $nom = isset($_POST['name']) ? trim($_POST['name']) : (isset($input['name']) ? trim($input['name']) : '');
        $cognom = isset($_POST['cognom']) ? trim($_POST['cognom']) : (isset($input['cognom']) ? trim($input['cognom']) : '');
        $email = isset($_POST['mail']) ? trim($_POST['mail']) : (isset($input['mail']) ? trim($input['mail']) : '');
        $contrasenya = isset($_POST['contrasenya']) ? $_POST['contrasenya'] : (isset($input['contrasenya']) ? $input['contrasenya'] : '');
        $contrasenya_confirmar = isset($_POST['contrasenya_confirmar']) ? $_POST['contrasenya_confirmar'] : (isset($input['contrasenya_confirmar']) ? $input['contrasenya_confirmar'] : '');
        $telefono = isset($_POST['telefon']) ? trim($_POST['telefon']) : (isset($input['telefon']) ? trim($input['telefon']) : '');

        // Validar totes les dades
        if ($this->validador->validarTots($nom, $cognom, $email, $contrasenya, $contrasenya_confirmar, $telefono)) {
            // Si la validació és correcta, guardar l'usuari
            if ($this->guardador->guardarUsuari($nom, $cognom, $email, $contrasenya, $telefono)) {
                $this->respondJson([
                    'success' => true,
                    'message' => 'Usuari registrat correctament!'
                ], 201);
            } else {
                $errors = $this->guardador->getErrors();
                $this->respondJson([
                    'success' => false,
                    'error' => implode(', ', $errors),
                    'errors' => $errors
                ], 422);
            }
        } else {
            $errors = $this->validador->getErrors();
            $this->respondJson([
                'success' => false,
                'error' => implode(', ', $errors),
                'errors' => $errors
            ], 422);
        }
    }
}
