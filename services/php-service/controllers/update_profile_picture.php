<?php
session_start();
require_once "../models/DatabaseConnection.php";
require_once "../models/sessionModel.php";

class UpdateProfilePictureController
{
    private $conexio;
    private $uploadDir = '../uploads/profiles/';

    public function __construct()
    {
        header('Content-Type: application/json');
        $this->processRequest();
    }

    private function processRequest()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->respond(['success' => false, 'error' => 'Mètode no permès'], 405);
        }

        // Autenticació
        SessionModel::iniciarSessio();
        $userId = null;

        if (SessionModel::estaAutenticat()) {
            $userId = SessionModel::obtenirIdUsuari();
        }

        // Si no hi ha sessió PHP, intentar via user_id (per a OAuth)
        if (!$userId) {
            $userId = intval($_POST['user_id'] ?? 0);
            if (!$userId) {
                $this->respond(['success' => false, 'error' => 'No autenticat'], 401);
            }
        }

        if (!isset($_FILES['profile_image'])) {
            $this->respond(['success' => false, 'error' => 'No s\'ha rebut cap imatge'], 400);
        }

        $file = $_FILES['profile_image'];
        
        // Validació d'errors de pujada
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->respond(['success' => false, 'error' => 'Error en la pujada del fitxer: ' . $file['error']], 500);
        }

        // Validació de tipus
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, $allowedTypes)) {
            $this->respond(['success' => false, 'error' => 'Tipus de fitxer no permès. Només JPG, PNG i WebP.'], 400);
        }

        // Validació de mida (2MB)
        if ($file['size'] > 2 * 1024 * 1024) {
            $this->respond(['success' => false, 'error' => 'La imatge és massa gran. Màxim 2MB.'], 400);
        }

        // Crear directori si no existeix
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }

        // Generar nom únic
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = 'profile_' . $userId . '_' . time() . '.' . $extension;
        $targetPath = $this->uploadDir . $fileName;

        // Moure fitxer
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            $this->respond(['success' => false, 'error' => 'No s\'ha pogut desar la imatge al servidor.'], 500);
        }

        // Actualitzar base de dades
        try {
            $this->conexio = DatabaseConnection::create();
            
            // Opcional: Eliminar imatge antiga? Per ara només actualitzem.
            
            $stmt = $this->conexio->prepare("UPDATE usuaris SET foto_perfil = ? WHERE id = ?");
            if (!$stmt) {
                $this->respond(['success' => false, 'error' => 'Error en la consulta BDD'], 500);
            }

            $stmt->bind_param('si', $fileName, $userId);
            $ok = $stmt->execute();
            $stmt->close();
            $this->conexio->close();

            if (!$ok) {
                $this->respond(['success' => false, 'error' => 'No s\'ha pogut actualitzar la referència a la BDD.'], 500);
            }

            $imageUrl = 'controllers/uploads/profiles/' . $fileName; // Ajustat segons estructura php-service

            $this->respond([
                'success' => true,
                'message' => 'Imatge de perfil actualitzada correctament.',
                'foto_perfil' => $fileName,
                'url' => $fileName // El frontend construirà la URL completa usant PHP_API_URL + 'controllers/uploads/profiles/' + fileName
            ]);

        } catch (Exception $e) {
            $this->respond(['success' => false, 'error' => 'Error de base de dades: ' . $e->getMessage()], 500);
        }
    }

    private function respond($data, $status = 200)
    {
        http_response_code($status);
        echo json_encode($data);
        exit();
    }
}

if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new UpdateProfilePictureController();
}
