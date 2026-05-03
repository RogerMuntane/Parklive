<?php

require_once __DIR__ . '/DatabaseConnection.php';

class AdminUserModel
{
    private $conexio;
    private $errors = array();

    public function __construct()
    {
        try {
            $this->conexio = DatabaseConnection::create();
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            $this->conexio = null;
        }
    }

    /**
     * Verifica si el model està llest per operar
     */
    public function isReady(): bool
    {
        return $this->conexio !== null && $this->conexio->connect_errno === 0;
    }

    /**
     * Obté els usuaris amb opció de cerca, filtre per rol i paginació
     */
    public function getAllUsers($search = '', $role = '', $limit = 10, $offset = 0)
    {
        try {
            $query = "SELECT id, nom, cognoms, email, telefon, tipus_usuari, estat, data_registre, foto_perfil 
                      FROM usuaris 
                      WHERE estat != 'eliminat'";
            
            $params = [];
            $types = '';

            if (!empty($search)) {
                $searchParam = "%$search%";
                $query .= " AND (nom LIKE ? OR cognoms LIKE ? OR email LIKE ?)";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
                $types .= 'sss';
            }

            if (!empty($role)) {
                $query .= " AND tipus_usuari = ?";
                $params[] = $role;
                $types .= 's';
            }

            // Paginació
            $query .= " ORDER BY id DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            $types .= 'ii';

            if (!$this->isReady()) {
                throw new Exception("Conexió a la base de dades no disponible");
            }

            $stmt = $this->conexio->prepare($query);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            $result = $stmt->get_result();
            $users = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            
            return $users;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return [];
        }
    }

    /**
     * Compta el nombre total d'usuaris per a una cerca i rol específics
     */
    public function getTotalUsersCount($search = '', $role = '')
    {
        try {
            $query = "SELECT COUNT(*) as total FROM usuaris WHERE estat != 'eliminat'";
            
            $params = [];
            $types = '';

            if (!empty($search)) {
                $searchParam = "%$search%";
                $query .= " AND (nom LIKE ? OR cognoms LIKE ? OR email LIKE ?)";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
                $types .= 'sss';
            }

            if (!empty($role)) {
                $query .= " AND tipus_usuari = ?";
                $params[] = $role;
                $types .= 's';
            }

            if (!$this->isReady()) {
                throw new Exception("Conexió a la base de dades no disponible");
            }

            $stmt = $this->conexio->prepare($query);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();
            
            return (int) $row['total'];
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return 0;
        }
    }

    /**
     * Crea un usuari (Admin)
     */
    public function createUser($data)
    {
        try {
            $hash = password_hash($data['contrasenya'], PASSWORD_BCRYPT);
            
            $stmt = $this->conexio->prepare("CALL sp_insertar_usuari(?, ?, ?, ?, ?, ?, @nou_id, @error_msg)");
            $stmt->bind_param('ssssss', 
                $data['nom'], 
                $data['cognoms'], 
                $data['email'], 
                $hash, 
                $data['telefon'], 
                $data['rol']
            );
            
            if ($stmt->execute()) {
                $stmt->close();
                $result = $this->conexio->query("SELECT @nou_id as nou_id, @error_msg as error_msg");
                $row = $result->fetch_assoc();
                if ($row['nou_id'] === null) {
                    throw new Exception($row['error_msg'] ?? 'Error al crear usuari');
                }
                return $row['nou_id'];
            }
            return false;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    /**
     * Actualitza un usuari
     */
    public function updateUser($id, $data)
    {
        try {
            $query = "UPDATE usuaris SET nom = ?, cognoms = ?, email = ?, telefon = ?, tipus_usuari = ?, estat = ? WHERE id = ?";
            $stmt = $this->conexio->prepare($query);
            $stmt->bind_param('ssssssi', 
                $data['nom'], 
                $data['cognoms'], 
                $data['email'], 
                $data['telefon'], 
                $data['rol'],
                $data['estat'],
                $id
            );
            
            $success = $stmt->execute();
            $stmt->close();
            return $success;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    /**
     * Elimina un usuari (soft delete)
     */
    public function deleteUser($id)
    {
        try {
            // Primer comprobem que l'usuari no sigui admin
            $stmtCheck = $this->conexio->prepare("SELECT tipus_usuari FROM usuaris WHERE id = ?");
            $stmtCheck->bind_param('i', $id);
            $stmtCheck->execute();
            $userResult = $stmtCheck->get_result()->fetch_assoc();
            $stmtCheck->close();

            if ($userResult && $userResult['tipus_usuari'] === 'admin') {
                throw new Exception('No es pot eliminar un compte d\'administrador');
            }

            $query = "UPDATE usuaris SET estat = 'eliminat' WHERE id = ?";
            $stmt = $this->conexio->prepare($query);
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
