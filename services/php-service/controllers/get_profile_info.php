<?php
session_start();
require_once "../models/DatabaseConnection.php";
require_once "../models/sessionModel.php";
require_once "../models/validarUsuari.php";
require_once "../models/loginModel.php";

class GetProfileInfoController
{
    private $loginModel;

    public function __construct()
    {
        header('Content-Type: application/json');
        $this->loginModel = new LoginModel();
        $this->processRequest();
    }

    private function processRequest()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $this->respond(['success' => false, 'error' => 'Mètode no permès'], 405);
        }

        SessionModel::iniciarSessio();
        if (!SessionModel::estaAutenticat()) {
            $this->respond(['success' => false, 'error' => 'No autenticat'], 401);
        }

        $userId = SessionModel::obtenirIdUsuari();
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

// Executar el controlador si l'accés és directe
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new GetProfileInfoController();
}
