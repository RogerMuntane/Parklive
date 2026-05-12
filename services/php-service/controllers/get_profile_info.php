<?php
require_once __DIR__ . "/../models/DatabaseConnection.php";
require_once __DIR__ . "/../models/validarUsuari.php";
require_once __DIR__ . "/../models/loginModel.php";
require_once __DIR__ . "/../middleware/AuthMiddleware.php";

/**
 * Class GetProfileInfoController
 * 
 * Controlador per obtenir la informació del perfil de l'usuari autenticat.
 */
class GetProfileInfoController
{
    /** @var LoginModel Instància del model de login per accedir a les dades de l'usuari */
    private $loginModel;

    /**
     * GetProfileInfoController constructor.
     * Inicialitza el model de login.
     */
    public function __construct()
    {
        $this->loginModel = new LoginModel();
    }

    /**
     * Processa la petició GET per retornar les dades del perfil de l'usuari.
     * 
     * @return void
     */
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
            'biografia' => $user['biografia'] ?? '',
            'foto_perfil' => $user['foto_perfil'] ?? null
        ];

        $this->respond(['success' => true, 'data' => $profileData]);
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

