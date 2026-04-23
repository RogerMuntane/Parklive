<?php

session_start();
require_once __DIR__ . "/../models/AdminUserModel.php";
require_once __DIR__ . "/../models/sessionModel.php";

class AdminUserController
{
    private $model;

    public function __construct()
    {
        header('Content-Type: application/json');
        
        // Verificar autenticació i rol
        SessionModel::iniciarSessio();
        if (!SessionModel::estaAutenticat() || !self::isAdmin()) {
            $this->respond(['success' => false, 'error' => 'No tens permisos per realitzar aquesta acció'], 403);
        }

        $this->model = new AdminUserModel();
        $this->processRequest();
    }

    private static function isAdmin()
    {
        $usuari = SessionModel::obtenirUsuari();
        return ($usuari && isset($usuari['rol']) && $usuari['rol'] === 'admin');
    }

    private function processRequest()
    {
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
        if (empty($data['nom']) || empty($data['email']) || empty($data['contrasenya'])) {
            $this->respond(['success' => false, 'error' => 'Falten dades obligatòries'], 400);
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
        echo json_encode($data);
        exit();
    }
}

// Executar si l'accés és directe
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new AdminUserController();
}
