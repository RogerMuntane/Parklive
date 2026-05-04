<?php

require_once __DIR__ . "/../models/DatabaseConnection.php";
require_once __DIR__ . "/../models/loginModel.php";

class GoogleAuth
{
    private $loginModel;

    public function __construct()
    {
        $this->loginModel = new LoginModel();
    }

    private function respondJson($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit();
    }

    public function processLogin()
    {
        try {
            $inputJSON = file_get_contents('php://input');
            $input = json_decode($inputJSON, TRUE);

            $accessToken = isset($_POST['access_token']) ? trim($_POST['access_token']) : (isset($input['access_token']) ? trim($input['access_token']) : '');

            if (empty($accessToken)) {
                $this->respondJson(['success' => false, 'error' => 'Falta el camp access_token'], 400);
            }

            // Verificar el token amb Google
            $url = "https://www.googleapis.com/oauth2/v3/userinfo";
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer " . $accessToken
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                $this->respondJson(['success' => false, 'error' => 'Token de Google invàlid o caducat'], 401);
            }

            $googleData = json_decode($response, true);
            $email = $googleData['email'] ?? null;

            if (!$email) {
                $this->respondJson(['success' => false, 'error' => 'No s\'ha pogut obtenir l\'email de Google'], 400);
            }

            // Buscar l'usuari per email (Python ja hauria d'haver-lo creat si és nou)
            $db = DatabaseConnection::create();
            $stmt = $db->prepare("CALL sp_obtenir_usuari_per_email(?)");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if (!$result || $result->num_rows === 0) {
                // Si Python encara no ha acabat o ha fallat, no podem fer el sync
                $this->respondJson(['success' => false, 'error' => 'L\'usuari no s\'ha trobat a la base de dades. Assegura\'t que Python hagi completat el registre.'], 404);
            }

            $usuari = $result->fetch_assoc();
            $stmt->close();

            // Guardar l'usuari (sense SessionModel ja que només usem JWT)

            // Generar JWT Token
            require_once __DIR__ . '/../models/JwtService.php';
            $token = JwtService::generateToken($usuari);

            $this->respondJson([
                'success' => true,
                'message' => 'Sessió sincronitzada correctament.',
                'user' => $usuari,
                'token' => $token
            ]);
        } catch (Exception $e) {
            $this->respondJson(['success' => false, 'error' => 'Error intern al sincronitzar: ' . $e->getMessage()], 500);
        }
    }
}
