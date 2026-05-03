<?php
require_once __DIR__ . "/../models/DatabaseConnection.php";
require_once __DIR__ . "/../models/validarUsuari.php";
require_once __DIR__ . "/../models/loginModel.php";
require_once __DIR__ . "/../middleware/AuthMiddleware.php";

class GetProfileInfoController
{
    private $loginModel;

    public function __construct()
    {
        $this->loginModel = new LoginModel();
    }

    public function processRequest()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $this->respond(['success' => false, 'error' => 'Mètode no permès'], 405);
        }

        AuthMiddleware::verificarAutenticacio();
        $userId = AuthMiddleware::obtenirIdUsuari();
        $user = $this->loginModel->getUserById($userId);

        if (!$user) {
            $this->respond(['success' => false, 'error' => 'Usuari no trobat'], 404);
        }

        $profileData = [
            'nom' => $user['nom'] ?? '',
            'cognom' => $user['cognoms'] ?? $user['cognom'] ?? '',
            'email' => $user['email'] ?? '',
            'telefon' => $user['telefon'] ?? $user['telefono'] ?? '',
            'biografia' => $user['biografia'] ?? ''
        ];

        $this->respond(['success' => true, 'data' => $profileData]);
    }

    private function respond($data, $status = 200)
    {
        http_response_code($status);
        echo json_encode($data);
        exit();
    }
}
