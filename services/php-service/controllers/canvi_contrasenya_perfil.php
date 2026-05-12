<?php
require_once __DIR__ . "/../models/loginModel.php";
require_once __DIR__ . "/../models/validarUsuari.php";
require_once __DIR__ . "/../middleware/AuthMiddleware.php";

/**
 * Class CanviContrasenyaPerfilController
 * 
 * Controlador per gestionar el canvi de contrasenya des del perfil de l'usuari.
 */
class CanviContrasenyaPerfilController
{
    /** @var LoginModel Instància del model de login per gestionar credencials */
    private $loginModel;

    /** @var ValidarUsuari Instància del validador per comprovar la seguretat de la nova contrasenya */
    private $validador;

    /**
     * CanviContrasenyaPerfilController constructor.
     * Inicialitza els models i validadors necessaris.
     */
    public function __construct()
    {
        $this->loginModel = new LoginModel();
        $this->validador = new ValidarUsuari();
    }

    /**
     * Processa la petició de canvi de contrasenya.
     * Verifica l'autenticació, la contrasenya actual i valida la nova contrasenya.
     * 
     * @return void
     */
    public function processRequest()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
            $this->respond(['success' => false, 'error' => 'Mètode no permès'], 405);
        }

        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, TRUE);
        
        AuthMiddleware::verificarAutenticacio();
        $userId = AuthMiddleware::obtenirIdUsuari();
        
        $contrasenyaActual = $_POST['contrasenya_actual'] ?? ($input['contrasenya_actual'] ?? '');
        $contrasenyaNova = $_POST['contrasenya_nova'] ?? ($input['contrasenya_nova'] ?? '');
        $contrasenyaConfirmar = $_POST['contrasenya_confirmar'] ?? ($input['contrasenya_confirmar'] ?? '');

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

    /**
     * Envia una resposta JSON al client i finalitza l'execució.
     * 
     * @param array $data Dades a enviar en format JSON.
     * @param int $status Codi d'estat HTTP (per defecte 200).
     * @return void
     */
    private function respond($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit();
    }
}

