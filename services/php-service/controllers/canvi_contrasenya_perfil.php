<?php
session_start();
require_once "../models/sessionModel.php";
require_once "../models/loginModel.php";
require_once "../models/validarUsuari.php";

class CanviContrasenyaPerfilController
{
    private $loginModel;
    private $validador;

    public function __construct()
    {
        header('Content-Type: application/json');
        $this->loginModel = new LoginModel();
        $this->validador = new validarUsuari();
        $this->processRequest();
    }

    private function processRequest()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->respond(['success' => false, 'error' => 'Mètode no permès'], 405);
        }
        
        SessionModel::iniciarSessio();
        if (!SessionModel::estaAutenticat()) {
            $this->respond(['success' => false, 'error' => 'No autenticat'], 401);
        }
        $userId = SessionModel::obtenirIdUsuari();
        $contrasenyaActual = $_POST['contrasenya_actual'] ?? '';
        $contrasenyaNova = $_POST['contrasenya_nova'] ?? '';
        $contrasenyaConfirmar = $_POST['contrasenya_confirmar'] ?? '';

        // Validació bàsica
        $errors = [];
        if (!$contrasenyaActual || !$contrasenyaNova || !$contrasenyaConfirmar) {
            $errors[] = 'Tots els camps són obligatoris.';
        }
        if ($contrasenyaNova !== $contrasenyaConfirmar) {
            $errors[] = 'La nova contrasenya i la confirmació no coincideixen.';
        }
        // Validació avançada (segons validador)
        if (!$this->validador->validarContrasenya($contrasenyaNova, $contrasenyaConfirmar)) {
            $errors = array_merge($errors, $this->validador->getErrors());
        }
        $this->validador->clearErrors();
        if ($errors) {
            $this->respond(['success' => false, 'errors' => $errors], 400);
        }

        // Comprovar contrasenya actual i si és OAuth
        $user = $this->loginModel->getUserById($userId);
        if (!$user) {
            $this->respond(['success' => false, 'errors' => ['Usuari no trobat.']], 400);
        }
        $oauthPlaceholders = ['GOOGLE_OAUTH_NO_PASSWORD', 'APPLE_OAUTH_NO_PASSWORD'];
        if (in_array($user['contrasenya_hash'], $oauthPlaceholders)) {
            $provider = strpos($user['contrasenya_hash'], 'GOOGLE') !== false ? 'Google' : 'Apple';
            $this->respond([
                'success' => false,
                'errors' => ["Aquest compte s'ha creat amb $provider. Inicia sessió amb $provider directament."],
            ], 400);
        }
        if (!password_verify($contrasenyaActual, $user['contrasenya_hash'])) {
            $this->respond(['success' => false, 'errors' => ['La contrasenya actual no és correcta.']], 400);
        }

        // Actualitzar contrasenya
        $hashNova = password_hash($contrasenyaNova, PASSWORD_DEFAULT);
        if ($this->loginModel->updatePassword($userId, $hashNova)) {
            $this->respond(['success' => true, 'message' => 'Contrasenya actualitzada correctament.']);
        } else {
            $this->respond(['success' => false, 'errors' => ['Error al guardar la nova contrasenya.']], 500);
        }
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
    new CanviContrasenyaPerfilController();
}
