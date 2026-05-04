<?php

require_once __DIR__ . "/DatabaseConnection.php";

class AdminAparcamentModel
{
    private $conexio;
    private $errors = [];
    private const MAX_PARKING_IMAGES = 10;
    private const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

    public function __construct()
    {
        try {
            $this->conexio = DatabaseConnection::create();
        } catch (Exception $e) {
            $this->errors[] = "Error de connexió: " . $e->getMessage();
            $this->conexio = null;
        }
    }

    private function checkConnection()
    {
        if (!$this->conexio) {
            throw new Exception("No hi ha connexió activa amb la base de dades.");
        }
        return true;
    }

    private function normalizeUploadedFiles($files)
    {
        if (empty($files) || !isset($files['name'])) {
            return [];
        }

        // Input multiple: name="parking_images[]"
        if (is_array($files['name'])) {
            $normalized = [];
            $total = count($files['name']);

            for ($i = 0; $i < $total; $i++) {
                $error = $files['error'][$i] ?? UPLOAD_ERR_NO_FILE;

                if ($error === UPLOAD_ERR_NO_FILE) {
                    continue;
                }

                $normalized[] = [
                    'name' => $files['name'][$i] ?? '',
                    'type' => $files['type'][$i] ?? '',
                    'tmp_name' => $files['tmp_name'][$i] ?? '',
                    'error' => $error,
                    'size' => $files['size'][$i] ?? 0,
                ];
            }

            return $normalized;
        }

        if (($files['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return [];
        }

        return [$files];
    }

    private function getMimeType($tmpName, $fallbackType = '')
    {
        if (class_exists('finfo')) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($tmpName);
            if ($mime) {
                return $mime;
            }
        }

        if (function_exists('mime_content_type')) {
            $mime = mime_content_type($tmpName);
            if ($mime) {
                return $mime;
            }
        }

        return $fallbackType;
    }

    private function getUploadErrorMessage($errorCode)
    {
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
                return "El fitxer excedeix la mida màxima del servidor.";
            case UPLOAD_ERR_FORM_SIZE:
                return "El fitxer excedeix la mida màxima del formulari.";
            case UPLOAD_ERR_PARTIAL:
                return "El fitxer només s'ha pujat parcialment.";
            case UPLOAD_ERR_NO_TMP_DIR:
                return "Falta la carpeta temporal del servidor.";
            case UPLOAD_ERR_CANT_WRITE:
                return "Error en escriure el fitxer al disc.";
            case UPLOAD_ERR_EXTENSION:
                return "Una extensió de PHP ha aturat la pujada.";
            default:
                return "Error de pujada desconegut.";
        }
    }

    private function getParkingPhotosCount($parkingId)
    {
        $stmt = $this->conexio->prepare("SELECT COUNT(*) AS total FROM fotografies_aparcaments WHERE aparcament_id = ?");
        if (!$stmt) {
            throw new Exception("Error al comptar fotografies: " . $this->conexio->error);
        }

        $stmt->bind_param('i', $parkingId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();

        return (int)($row['total'] ?? 0);
    }

    private function saveParkingImages($parkingId, $uploadedFiles, $userId = null)
    {
        $files = $this->normalizeUploadedFiles($uploadedFiles);
        if (empty($files)) {
            return;
        }

        if (count($files) > self::MAX_PARKING_IMAGES) {
            throw new Exception("Només es poden pujar un màxim de " . self::MAX_PARKING_IMAGES . " imatges.");
        }

        $existingCount = $this->getParkingPhotosCount($parkingId);
        if (($existingCount + count($files)) > self::MAX_PARKING_IMAGES) {
            throw new Exception("Aquest aparcament ja té {$existingCount} imatges. El màxim permès és " . self::MAX_PARKING_IMAGES . ".");
        }

        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $baseStoragePath = realpath(__DIR__ . '/../storage');
        if (!$baseStoragePath) {
            throw new Exception("No s'ha trobat el directori base de storage.");
        }

        $aparcamentsBaseDir = $baseStoragePath . '/aparcaments';
        if (!is_dir($aparcamentsBaseDir) && !@mkdir($aparcamentsBaseDir, 0755, true)) {
            throw new Exception("No s'ha pogut crear el directori base 'aparcaments' a storage. Revisa els permisos.");
        }

        $parkingDir = $aparcamentsBaseDir . '/' . (int)$parkingId;
        if (!is_dir($parkingDir) && !@mkdir($parkingDir, 0755, true)) {
            throw new Exception("No s'ha pogut crear el directori per a l'aparcament " . (int)$parkingId . ". Revisa els permisos d'escriptura.");
        }

        $ordre = $existingCount + 1;
        foreach ($files as $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                throw new Exception($this->getUploadErrorMessage((int)$file['error']));
            }

            if (($file['size'] ?? 0) > self::MAX_IMAGE_SIZE_BYTES) {
                throw new Exception("La imatge {$file['name']} supera la mida màxima de 5MB.");
            }

            $mimeType = $this->getMimeType($file['tmp_name'] ?? '', $file['type'] ?? '');
            if (!in_array($mimeType, $allowedMimeTypes, true)) {
                throw new Exception("Tipus de fitxer no permès per {$file['name']}. Només JPG, PNG i WebP.");
            }

            $extension = pathinfo($file['name'] ?? '', PATHINFO_EXTENSION);
            if (!$extension) {
                $extension = $mimeType === 'image/png' ? 'png' : ($mimeType === 'image/webp' ? 'webp' : 'jpg');
            }

            $safeName = 'parking_' . (int)$parkingId . '_' . bin2hex(random_bytes(8)) . '.' . strtolower($extension);
            $targetPath = $parkingDir . '/' . $safeName;

            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                throw new Exception("No s'ha pogut desar la imatge {$file['name']} al servidor.");
            }

            $relativeUrl = '/storage/aparcaments/' . (int)$parkingId . '/' . $safeName;
            $descripcio = null;
            $verificada = 1;
            $usuariId = $userId ? (int)$userId : null;

            $insertStmt = $this->conexio->prepare(
                "INSERT INTO fotografies_aparcaments (aparcament_id, usuari_id, url, descripcio, verificada, ordre)
                 VALUES (?, ?, ?, ?, ?, ?)"
            );

            if (!$insertStmt) {
                throw new Exception("Error al preparar la inserció de fotografies: " . $this->conexio->error);
            }

            $insertStmt->bind_param('iissii', $parkingId, $usuariId, $relativeUrl, $descripcio, $verificada, $ordre);
            $ok = $insertStmt->execute();
            $insertStmt->close();

            if (!$ok) {
                throw new Exception("Error al inserir la fotografia de l'aparcament.");
            }

            $ordre++;
        }
    }

    public function getAllAparcaments($search = '', $type = '', $status = '', $limit = 10, $offset = 0)
    {
        try {
            $this->checkConnection();

            $sql = "SELECT * FROM aparcaments WHERE 1=1";
            $params = [];
            $types = '';

            if (!empty($search)) {
                $sql .= " AND (nom LIKE ? OR adreca LIKE ? OR ciutat LIKE ?)";
                $searchParam = "%$search%";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
                $types .= 'sss';
            }

            if (!empty($type)) {
                $sql .= " AND tipus = ?";
                $params[] = $type;
                $types .= 's';
            }

            if (!empty($status)) {
                $sql .= " AND estat = ?";
                $params[] = $status;
                $types .= 's';
            }

            $sql .= " ORDER BY id DESC LIMIT ? OFFSET ?";
            $params[] = (int)$limit;
            $params[] = (int)$offset;
            $types .= 'ii';

            $stmt = $this->conexio->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error en la preparació de la consulta: " . $this->conexio->error);
            }

            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            $result = $stmt->get_result();
            $data = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();

            return $data;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return [];
        }
    }

    public function getTotalAparcamentsCount($search = '', $type = '', $status = '')
    {
        try {
            $this->checkConnection();

            $sql = "SELECT COUNT(*) as total FROM aparcaments WHERE 1=1";
            $params = [];
            $types = '';

            if (!empty($search)) {
                $sql .= " AND (nom LIKE ? OR adreca LIKE ? OR ciutat LIKE ?)";
                $searchParam = "%$search%";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
                $types .= 'sss';
            }

            if (!empty($type)) {
                $sql .= " AND tipus = ?";
                $params[] = $type;
                $types .= 's';
            }

            if (!empty($status)) {
                $sql .= " AND estat = ?";
                $params[] = $status;
                $types .= 's';
            }

            $stmt = $this->conexio->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error en la preparació de la consulta de comptatge: " . $this->conexio->error);
            }

            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $total = (int)($row['total'] ?? 0);
            $stmt->close();

            return $total;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return 0;
        }
    }

    public function createAparcament($data, $uploadedImages = null, $userId = null)
    {
        try {
            $this->checkConnection();
            $this->conexio->begin_transaction();

            $sql = "INSERT INTO aparcaments (
                nom, tipus, adreca, ciutat, codi_postal, latitud, longitud,
                capacitat_total, places_disponibles, tarifa_hora, tarifa_dia,
                horari_obertura, horari_tancament, obert_24h, accessibilitat,
                carrega_electrica, videovigilancia, altura_maxima, estat, verificat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmt = $this->conexio->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error al preparar la inserció: " . $this->conexio->error);
            }

            $obert_24h = (isset($data['obert_24h']) && ($data['obert_24h'] === true || $data['obert_24h'] === 'true' || $data['obert_24h'] == 1)) ? 1 : 0;
            $accessibilitat = (isset($data['accessibilitat']) && ($data['accessibilitat'] === true || $data['accessibilitat'] === 'true' || $data['accessibilitat'] == 1)) ? 1 : 0;
            $carrega_electrica = (isset($data['carrega_electrica']) && ($data['carrega_electrica'] === true || $data['carrega_electrica'] === 'true' || $data['carrega_electrica'] == 1)) ? 1 : 0;
            $videovigilancia = (isset($data['videovigilancia']) && ($data['videovigilancia'] === true || $data['videovigilancia'] === 'true' || $data['videovigilancia'] == 1)) ? 1 : 0;
            $verificat = (isset($data['verificat']) && ($data['verificat'] === true || $data['verificat'] === 'true' || $data['verificat'] == 1)) ? 1 : 0;

            $capacitat = (int)($data['capacitat_total'] ?? 0);
            $disponibles = (int)($data['places_disponibles'] ?? $capacitat);

            // Valors opcionals
            $tarifa_hora = !empty($data['tarifa_hora']) ? $data['tarifa_hora'] : null;
            $tarifa_dia = !empty($data['tarifa_dia']) ? $data['tarifa_dia'] : null;
            $horari_obertura = !empty($data['horari_obertura']) ? $data['horari_obertura'] : null;
            $horari_tancament = !empty($data['horari_tancament']) ? $data['horari_tancament'] : null;
            $altura_maxima = !empty($data['altura_maxima']) ? $data['altura_maxima'] : null;

            $types = "sssssss" . "ii" . "ssss" . "iiii" . "ss" . "i";

            $stmt->bind_param($types,
                $data['nom'],
                $data['tipus'],
                $data['adreca'],
                $data['ciutat'],
                $data['codi_postal'],
                $data['latitud'],
                $data['longitud'],
                $capacitat,
                $disponibles,
                $tarifa_hora,
                $tarifa_dia,
                $horari_obertura,
                $horari_tancament,
                $obert_24h,
                $accessibilitat,
                $carrega_electrica,
                $videovigilancia,
                $altura_maxima,
                $data['estat'],
                $verificat
            );

            $success = $stmt->execute();
            if (!$success) {
                throw new Exception("Error al executar la inserció: " . $stmt->error);
            }
            $newId = $this->conexio->insert_id;
            $stmt->close();

            $this->saveParkingImages((int)$newId, $uploadedImages, $userId);
            $this->conexio->commit();

            return $newId;
        } catch (Exception $e) {
            if ($this->conexio) {
                $this->conexio->rollback();
            }
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    public function updateAparcament($id, $data, $uploadedImages = null, $userId = null)
    {
        try {
            $this->checkConnection();
            $this->conexio->begin_transaction();

            $sql = "UPDATE aparcaments SET
                nom = ?, tipus = ?, adreca = ?, ciutat = ?,
                codi_postal = ?, latitud = ?, longitud = ?,
                capacitat_total = ?, places_disponibles = ?,
                tarifa_hora = ?, tarifa_dia = ?,
                horari_obertura = ?, horari_tancament = ?,
                obert_24h = ?, accessibilitat = ?,
                carrega_electrica = ?, videovigilancia = ?,
                altura_maxima = ?, estat = ?, verificat = ?
                WHERE id = ?";

            $stmt = $this->conexio->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error al preparar l'actualització: " . $this->conexio->error);
            }

            $obert_24h = (isset($data['obert_24h']) && ($data['obert_24h'] === true || $data['obert_24h'] === 'true' || $data['obert_24h'] == 1)) ? 1 : 0;
            $accessibilitat = (isset($data['accessibilitat']) && ($data['accessibilitat'] === true || $data['accessibilitat'] === 'true' || $data['accessibilitat'] == 1)) ? 1 : 0;
            $carrega_electrica = (isset($data['carrega_electrica']) && ($data['carrega_electrica'] === true || $data['carrega_electrica'] === 'true' || $data['carrega_electrica'] == 1)) ? 1 : 0;
            $videovigilancia = (isset($data['videovigilancia']) && ($data['videovigilancia'] === true || $data['videovigilancia'] === 'true' || $data['videovigilancia'] == 1)) ? 1 : 0;
            $verificat = (isset($data['verificat']) && ($data['verificat'] === true || $data['verificat'] === 'true' || $data['verificat'] == 1)) ? 1 : 0;

            $capacitat = (int)($data['capacitat_total'] ?? 0);
            $disponibles = (int)($data['places_disponibles'] ?? $capacitat);

            $tarifa_hora = !empty($data['tarifa_hora']) ? $data['tarifa_hora'] : null;
            $tarifa_dia = !empty($data['tarifa_dia']) ? $data['tarifa_dia'] : null;
            $horari_obertura = !empty($data['horari_obertura']) ? $data['horari_obertura'] : null;
            $horari_tancament = !empty($data['horari_tancament']) ? $data['horari_tancament'] : null;
            $altura_maxima = !empty($data['altura_maxima']) ? $data['altura_maxima'] : null;

            $types = "sssssss" . "ii" . "ssss" . "iiii" . "ss" . "i" . "i";

            $stmt->bind_param($types,
                $data['nom'],
                $data['tipus'],
                $data['adreca'],
                $data['ciutat'],
                $data['codi_postal'],
                $data['latitud'],
                $data['longitud'],
                $capacitat,
                $disponibles,
                $tarifa_hora,
                $tarifa_dia,
                $horari_obertura,
                $horari_tancament,
                $obert_24h,
                $accessibilitat,
                $carrega_electrica,
                $videovigilancia,
                $altura_maxima,
                $data['estat'],
                $verificat,
                $id
            );

            $success = $stmt->execute();
            if (!$success) {
                throw new Exception("Error al executar l'actualització: " . $stmt->error);
            }
            $stmt->close();

            $this->saveParkingImages((int)$id, $uploadedImages, $userId);
            $this->conexio->commit();
            return $success;
        } catch (Exception $e) {
            if ($this->conexio) {
                $this->conexio->rollback();
            }
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    public function deleteAparcament($id)
    {
        try {
            $this->checkConnection();
            $stmt = $this->conexio->prepare("DELETE FROM aparcaments WHERE id = ?");
            if (!$stmt) {
                throw new Exception("Error al preparar l'eliminació: " . $this->conexio->error);
            }
            $stmt->bind_param('i', $id);
            $success = $stmt->execute();
            $stmt->close();
            return $success;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function __destruct()
    {
        if ($this->conexio) {
            $this->conexio->close();
        }
    }
}
