<?php
/**
 * Controller per actualitzar la imatge de perfil de l'usuari.
 * Gestiona la pujada de fitxers, validació de tipus/mida i actualització a la BDD.
 */
session_start();
require_once "../models/DatabaseConnection.php";
require_once "../models/sessionModel.php";

class UpdateProfilePictureController
{
    private $conexio;
    private $uploadDir = '../uploads/profiles/';

    public function __construct()
    {
        // Forçar resposta JSON des del principi
        header('Content-Type: application/json');
        
        // Capturar qualsevol output inesperat (warnings, etc.) per no trencari el JSON
        ob_start();
        
        try {
            $this->processRequest();
        } catch (Throwable $e) {
            $this->respond([
                'success' => false, 
                'error' => 'Error intern del servidor: ' . $e->getMessage(),
                'type' => get_class($e)
            ], 500);
        }
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

        // Si no hi ha sessió PHP, intentar via user_id (per a OAuth o peticions desacoblades)
        if (!$userId) {
            $userId = intval($_POST['user_id'] ?? 0);
            if (!$userId) {
                $this->respond(['success' => false, 'error' => 'No autenticat o falta ID d\'usuari'], 401);
            }
        }

        if (!isset($_FILES['profile_image'])) {
            $this->respond(['success' => false, 'error' => 'No s\'ha rebut cap imatge'], 400);
        }

        $file = $_FILES['profile_image'];
        
        // Validació d'errors de pujada de PHP
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = $this->getUploadErrorMessage($file['error']);
            $this->respond(['success' => false, 'error' => $errorMsg], 400);
        }

        // Validació de tipus segura
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $mimeType = $this->getMimeType($file['tmp_name'], $file['type']);

        if (!in_array($mimeType, $allowedTypes)) {
            $this->respond(['success' => false, 'error' => 'Tipus de fitxer no permès (' . $mimeType . '). Només JPG, PNG i WebP.'], 400);
        }

        // Validació de mida (2MB)
        if ($file['size'] > 2 * 1024 * 1024) {
            $this->respond(['success' => false, 'error' => 'La imatge és massa gran. Màxim 2MB.'], 400);
        }

        // Crear directori si no existeix
        if (!is_dir($this->uploadDir)) {
            if (!mkdir($this->uploadDir, 0755, true)) {
                $this->respond(['success' => false, 'error' => 'No s\'ha pogut crear el directori de destinació.'], 500);
            }
        }

        // Generar nom únic per evitar col·lisions i caching
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        if (empty($extension)) {
            $extension = ($mimeType === 'image/jpeg') ? 'jpg' : (($mimeType === 'image/png') ? 'png' : 'webp');
        }
        $fileName = 'profile_' . $userId . '_' . time() . '.' . $extension;
        $targetPath = $this->uploadDir . $fileName;

        // Moure fitxer al directori final
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            $this->respond(['success' => false, 'error' => 'No s\'ha pogut desar la imatge al servidor. Comprova permisos.'], 500);
        }

        // Actualitzar base de dades
        try {
            $this->conexio = DatabaseConnection::create();
            
            // Opcional: Podríem eliminar la foto antiga aquí per estalviar espai
            
            $stmt = $this->conexio->prepare("UPDATE usuaris SET foto_perfil = ? WHERE id = ?");
            if (!$stmt) {
                $this->respond(['success' => false, 'error' => 'Error en preparar la consulta BDD'], 500);
            }

            $stmt->bind_param('si', $fileName, $userId);
            $ok = $stmt->execute();
            $stmt->close();
            $this->conexio->close();

            if (!$ok) {
                $this->respond(['success' => false, 'error' => 'No s\'ha pogut actualitzar la referència a la BDD.'], 500);
            }

            $this->respond([
                'success' => true,
                'message' => 'Imatge de perfil actualitzada correctament.',
                'foto_perfil' => $fileName
            ]);

        } catch (Exception $e) {
            $this->respond(['success' => false, 'error' => 'Error de base de dades: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Obté el MIME type de forma segura provant diversos mètodes.
     */
    private function getMimeType($tmpName, $fallbackType)
    {
        if (class_exists('finfo')) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            return $finfo->file($tmpName);
        }
        if (function_exists('mime_content_type')) {
            return mime_content_type($tmpName);
        }
        return $fallbackType;
    }

    /**
     * Tradueix els errors de PHP Upload a missatges llegibles.
     */
    private function getUploadErrorMessage($errorCode)
    {
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:   return "El fitxer excedeix la mida màxima permetuda pel servidor (upload_max_filesize).";
            case UPLOAD_ERR_FORM_SIZE:  return "El fitxer excedeix la mida màxima permetuda pel formulari.";
            case UPLOAD_ERR_PARTIAL:    return "El fitxer només s'ha pujat parcialment.";
            case UPLOAD_ERR_NO_FILE:    return "No s'ha pujat cap fitxer.";
            case UPLOAD_ERR_NO_TMP_DIR: return "Falta la carpeta temporal al servidor.";
            case UPLOAD_ERR_CANT_WRITE: return "Error en escriure el fitxer al disc.";
            case UPLOAD_ERR_EXTENSION:  return "Una extensió de PHP ha aturat la pujada.";
            default:                    return "Error de pujada desconegut (" . $errorCode . ").";
        }
    }

    /**
     * Neteja qualsevol output previ i envia la resposta JSON.
     */
    private function respond($data, $status = 200)
    {
        // Netejar qualsevol warning o output que hagi pogut sortir
        if (ob_get_length()) ob_clean();
        
        http_response_code($status);
        echo json_encode($data);
        exit();
    }
}

// Iniciar el controlador
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new UpdateProfilePictureController();
}
