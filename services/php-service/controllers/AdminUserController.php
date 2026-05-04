<?php

require_once __DIR__ . "/../models/AdminUserModel.php";
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AdminUserController
{
    private $model;

    public function __construct()
    {
    }

    private static function isAdmin()
    {
        $usuari = AuthMiddleware::obtenirUsuariAutenticat();
        if (!$usuari || !isset($usuari['tipus_usuari'])) return false;
        
        $rol = strtolower($usuari['tipus_usuari']);
        return $rol === 'administrador' || $rol === 'admin';
    }

    public function processRequest()
    {
        AuthMiddleware::verificarAutenticacio();
        if (!self::isAdmin()) {
            $this->respond(['success' => false, 'error' => 'Accés denegat: es requereix rol administrador'], 403);
        }

        try {
            $this->model = new AdminUserModel();
            if (!$this->model->isReady()) {
                throw new Exception("El model de dades no està a punt: " . implode(", ", $this->model->getErrors()));
            }
        } catch (Exception $e) {
            $this->respond(['success' => false, 'error' => 'Error de base de dades: ' . $e->getMessage()], 500);
        }

        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';

        switch ($method) {
            case 'GET':
                $search = trim($_GET['search'] ?? '');
                $role = trim($_GET['role'] ?? '');
                
                $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
                $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 10;
                $offset = ($page - 1) * $limit;

                $total = $this->model->getTotalUsersCount($search, $role);
                $users = $this->model->getAllUsers($search, $role, $limit, $offset);
                
                $totalPages = ceil($total / $limit);

                $this->respond([
                    'success' => true, 
                    'data' => $users,
                    'pagination' => [
                        'total' => $total,
                        'page' => $page,
                        'limit' => $limit,
                        'total_pages' => $totalPages
                    ]
                ]);
                break;

            case 'POST':
                // Les dades arriben per POST (Crear) o via input stream per a PUT/DELETE
                $data = json_decode(file_get_contents('php://input'), true);
                
                if ($action === 'create') {
                    $this->handleCreate($data);
                } elseif ($action === 'update') {
                    $id = $_GET['id'] ?? null;
                    $this->handleUpdate($id, $data);
                } elseif ($action === 'delete') {
                    $id = $_GET['id'] ?? null;
                    $this->handleDelete($id);
                } else {
                    $this->respond(['success' => false, 'error' => 'Acció no vàlida'], 400);
                }
                break;

            default:
                $this->respond(['success' => false, 'error' => 'Mètode no permès'], 405);
                break;
        }
    }

    private function handleCreate($data)
    {
        $errors = [];
        if (empty($data['nom']))    $errors[] = 'El nom és obligatori.';
        if (empty($data['cognoms'])) $errors[] = 'El cognom és obligatori.';
        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'El correu electrònic no és vàlid.';
        }
        if (empty($data['contrasenya']) || strlen($data['contrasenya']) < 8) {
            $errors[] = 'La contrasenya ha de tenir com a mínim 8 caràcters.';
        }
        if (!empty($data['telefon']) && !preg_match('/^[+\d\s]{7,20}$/', $data['telefon'])) {
            $errors[] = 'El telèfon no és vàlid.';
        }
        if ($errors) {
            $this->respond(['success' => false, 'errors' => $errors], 400);
        }

        $result = $this->model->createUser($data);
        if ($result) {
            $this->respond(['success' => true, 'message' => 'Usuari creat correctament', 'id' => $result]);
        } else {
            $this->respond(['success' => false, 'errors' => $this->model->getErrors()], 500);
        }
    }

    private function handleUpdate($id, $data)
    {
        if (!$id) {
            $this->respond(['success' => false, 'error' => 'ID d\'usuari no proporcionat'], 400);
        }

        if (empty($data['nom']) || empty($data['email'])) {
            $this->respond(['success' => false, 'error' => 'El nom i l\'email són obligatoris'], 400);
        }

        $result = $this->model->updateUser($id, $data);
        if ($result) {
            $this->respond(['success' => true, 'message' => 'Usuari actualitzat correctament']);
        } else {
            $this->respond(['success' => false, 'errors' => $this->model->getErrors()], 500);
        }
    }

    private function handleDelete($id)
    {
        if (!$id) {
            $this->respond(['success' => false, 'error' => 'ID d\'usuari no proporcionat'], 400);
        }

        $result = $this->model->deleteUser($id);
        if ($result) {
            $this->respond(['success' => true, 'message' => 'Usuari eliminat correctament']);
        } else {
            $this->respond(['success' => false, 'errors' => $this->model->getErrors()], 500);
        }
    }

    private function respond($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit();
    }
}
