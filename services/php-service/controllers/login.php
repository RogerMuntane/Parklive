<?php

require_once __DIR__ . "/../models/loginModel.php";
require_once __DIR__ . "/../middleware/AuthMiddleware.php";

/**
 * Class Login
 * 
 * Controlador per gestionar l'inici de sessió d'usuaris.
 */
class Login
{
    /** @var LoginModel Instància del model de login */
    private $model;

    /**
     * Login constructor.
     * Verifica que l'usuari no estigui ja autenticat i inicialitza el model.
     */
    public function __construct()
    {
        // Verificar que l'usuari NO estigui ja autenticat
        AuthMiddleware::verificarNoAutenticat();

        $this->model = new LoginModel();
    }

    /**
     * Retorna una resposta JSON i atura l'execució.
     * 
     * @param array $data Dades a enviar en format JSON.
     * @param int $statusCode Codi d'estat HTTP (per defecte 200).
     * @return void
     */
    private function respondJson($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit();
    }

    /**
     * Processa la petició d'inici de sessió.
     * Autentica l'usuari mitjançant el model i genera un token JWT en cas d'èxit.
     * 
     * @return void
     */
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

