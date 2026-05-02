<?php

require_once __DIR__ . "/DatabaseConnection.php";

class AdminAparcamentModel
{
    private $conexio;
    private $errors = [];

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

    public function createAparcament($data)
    {
        try {
            $this->checkConnection();

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
            
            return $newId;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    public function updateAparcament($id, $data)
    {
        try {
            $this->checkConnection();

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
            return $success;
        } catch (Exception $e) {
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
