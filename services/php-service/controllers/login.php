<?php

require_once __DIR__ . "/../models/loginModel.php";
require_once __DIR__ . "/../middleware/AuthMiddleware.php";

class Login
{
    private $model;

    public function __construct()
    {
        // Verificar que l'usuari NO estigui ja autenticat
        AuthMiddleware::verificarNoAutenticat();

        $this->model = new LoginModel();
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

    public function processLogin()
    {
        // Permetre tant POST tradicional (formulari) com dades en format JSON (fetch)
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, TRUE);

        $email = !empty($_POST['mail']) ? trim($_POST['mail']) : (!empty($input['mail']) ? trim($input['mail']) : '');
        $contrasenya = !empty($_POST['contrasenya']) ? $_POST['contrasenya'] : (!empty($input['contrasenya']) ? $input['contrasenya'] : '');

        $usuari = $this->model->autenticar($email, $contrasenya);

        if (!$usuari) {
            $errors = $this->model->getErrors();
            $this->respondJson([
                'success' => false,
                'error' => implode(', ', $errors),
                'errors' => $errors
            ], 401);
        }

        // Generar JWT Token
        require_once __DIR__ . '/../models/JwtService.php';
        $token = JwtService::generateToken($usuari);

        $this->respondJson([
            'success' => true,
            'message' => 'Sessió iniciada correctament.',
            'user' => $usuari,
            'token' => $token
        ]);
    }
}
