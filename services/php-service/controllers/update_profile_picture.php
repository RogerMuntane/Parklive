<?php
/**
 * Controller per actualitzar la imatge de perfil de l'usuari.
 * Gestiona la pujada de fitxers, validació de tipus/mida i actualització a la BDD.
 *
 * Flux Cloudinary:
 *   1. Rep la imatge pujada per l'usuari.
 *   2. L'envia a Cloudinary amb transformació q_auto + format webp.
 *   3. Descarrega la versió optimitzada i la desa localment.
 *   4. Esborra l'actiu de Cloudinary per alliberar quota.
 *   5. Actualitza la BD amb el nom del fitxer local.
 */
require_once __DIR__ . "/../models/DatabaseConnection.php";

class UpdateProfilePictureController
{
    private $uploadDir;
    private $uploadError = null;

    public function __construct()
    {
        try {
            $envDir = getenv('UPLOAD_DIR');
            if (!$envDir) {
                throw new Exception("La variable d'entorn UPLOAD_DIR no està definida.");
            }

            $basePath = realpath(__DIR__ . '/../');
            if (!$basePath) {
                throw new Exception("No s'ha pogut determinar la ruta arrel del projecte.");
            }

            $this->uploadDir = $basePath . '/' . trim($envDir, '/') . '/';
        } catch (Throwable $e) {
            $this->uploadError = $e->getMessage();
        }
    }

    public function processRequest()
    {
        if ($this->uploadError) {
            $this->respond(['success' => false, 'error' => 'Error de configuració: ' . $this->uploadError], 500);
        }

        // Capturar qualsevol output inesperat (warnings, etc.) per no trencar el JSON
        ob_start();
        try {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                $this->respond(['success' => false, 'error' => 'Mètode no permès'], 405);
            }

            require_once __DIR__ . '/../middleware/AuthMiddleware.php';
            // JWT és obligatori. No hi ha fallback: si verificarAutenticacio() no fa exit(), userId és sempre vàlid.
            AuthMiddleware::verificarAutenticacio();
            $userId = AuthMiddleware::obtenirIdUsuari();

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

            // Nom de destinació: sempre .webp (Cloudinary fa la conversió)
            $fileName  = 'profile_' . $userId . '_' . time() . '.webp';
            $targetPath = $this->uploadDir . $fileName;

            // ── Cloudinary: pujar → descarregar optimitzada → esborrar del núvol ──
            $cloudName = getenv('cloud_name');
            $apiKey    = trim(getenv('Cloudinary_API_KEY'));
            $apiSecret = trim(getenv('Cloudinary_API_Secret'));

            if (!$cloudName || !$apiKey || !$apiSecret) {
                $this->respond(['success' => false, 'error' => 'Credencials de Cloudinary no configurades.'], 500);
            }

            $publicId  = 'parklive_tmp/profile_' . $userId . '_' . time();
            $timestamp = time();

            // Signature per a signed upload
            $signatureStr = "format=webp&public_id={$publicId}&timestamp={$timestamp}&transformation=q_auto" . $apiSecret;
            $signature    = sha1($signatureStr);

            $uploadUrl = "https://api.cloudinary.com/v1_1/{$cloudName}/image/upload";

            // 1. Pujar a Cloudinary via cURL amb transformació q_auto + f_webp
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL            => $uploadUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => [
                    'file'           => new CURLFile($file['tmp_name'], $mimeType, $file['name']),
                    'api_key'        => $apiKey,
                    'timestamp'      => $timestamp,
                    'public_id'      => $publicId,
                    'signature'      => $signature,
                    'format'         => 'webp',
                    'transformation' => 'q_auto',
                ],
                CURLOPT_TIMEOUT        => 30,
            ]);
            $uploadResponse = curl_exec($ch);
            $uploadHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if (!$uploadResponse || $uploadHttpCode !== 200) {
                $this->respond(['success' => false, 'error' => 'Error en pujar la imatge a Cloudinary (HTTP ' . $uploadHttpCode . ').'], 502);
            }

            $uploadData = json_decode($uploadResponse, true);
            if (empty($uploadData['secure_url'])) {
                $this->respond(['success' => false, 'error' => 'Cloudinary no ha retornat una URL vàlida.'], 502);
            }

            $optimizedUrl = $uploadData['secure_url'];

            // 2. Descarregar la imatge optimitzada i desar-la localment
            $imgContent = file_get_contents($optimizedUrl);
            if ($imgContent === false) {
                $this->respond(['success' => false, 'error' => 'No s\'ha pogut descarregar la imatge optimitzada de Cloudinary.'], 502);
            }

            if (file_put_contents($targetPath, $imgContent) === false) {
                $this->respond(['success' => false, 'error' => 'No s\'ha pogut desar la imatge al servidor. Comprova permisos.'], 500);
            }

            // 3. Esborrar de Cloudinary per alliberar quota del núvol
            $destroyTimestamp = time();
            $destroySignature = sha1("public_id={$publicId}&timestamp={$destroyTimestamp}" . $apiSecret);
            $destroyUrl = "https://api.cloudinary.com/v1_1/{$cloudName}/image/destroy";

            $chDel = curl_init();
            curl_setopt_array($chDel, [
                CURLOPT_URL            => $destroyUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => http_build_query([
                    'public_id' => $publicId,
                    'api_key'   => $apiKey,
                    'timestamp' => $destroyTimestamp,
                    'signature' => $destroySignature,
                ]),
                CURLOPT_TIMEOUT        => 10,
            ]);
            curl_exec($chDel);
            curl_close($chDel);
            // No bloquejar el flux si la neteja del núvol falla

            // 4. Actualitzar base de dades
            $this->conexio = DatabaseConnection::create();

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
                'success'     => true,
                'message'     => 'Imatge de perfil actualitzada correctament.',
                'foto_perfil' => $fileName
            ]);

        } catch (Throwable $e) {
            $this->respond([
                'success' => false,
                'error'   => 'Error intern del servidor: ' . $e->getMessage(),
                'type'    => get_class($e)
            ], 500);
        }
    }

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

    private function getUploadErrorMessage($errorCode)
    {
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
                return "El fitxer excedeix la mida màxima permetuda pel servidor (upload_max_filesize).";
            case UPLOAD_ERR_FORM_SIZE:
                return "El fitxer excedeix la mida màxima permetuda pel formulari.";
            case UPLOAD_ERR_PARTIAL:
                return "El fitxer només s'ha pujat parcialment.";
            case UPLOAD_ERR_NO_FILE:
                return "No s'ha pujat cap fitxer.";
            case UPLOAD_ERR_NO_TMP_DIR:
                return "Falta la carpeta temporal al servidor.";
            case UPLOAD_ERR_CANT_WRITE:
                return "Error en escriure el fitxer al disc.";
            case UPLOAD_ERR_EXTENSION:
                return "Una extensió de PHP ha aturat la pujada.";
            default:
                return "Error de pujada desconegut (" . $errorCode . ").";
        }
    }

    private function respond($data, $status = 200)
    {
        // Netejar qualsevol warning o output que hagi pogut sortir
        if (ob_get_length())
            ob_clean();

        http_response_code($status);
        echo json_encode($data);
        exit();
    }
}
