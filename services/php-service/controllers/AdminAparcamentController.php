<?php

require_once __DIR__ . "/../models/AdminAparcamentModel.php";
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AdminAparcamentController
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
            $this->respond(['success' => false, 'error' => 'No tens permisos per realitzar aquesta acció'], 403);
        }

        $this->model = new AdminAparcamentModel();

        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';

        switch ($method) {
            case 'GET':
                $search = trim($_GET['search'] ?? '');
                $type = trim($_GET['type'] ?? '');
                $status = trim($_GET['status'] ?? '');

                $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
                $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 10;
                $offset = ($page - 1) * $limit;

                $total = $this->model->getTotalAparcamentsCount($search, $type, $status);
                $parkings = $this->model->getAllAparcaments($search, $type, $status, $limit, $offset);

                if (!empty($this->model->getErrors())) {
                    $this->respond([
                        'success' => false,
                        'error' => 'Error de dades',
                        'details' => $this->model->getErrors()
                    ], 500);
                }

                $totalPages = ceil($total / $limit);

                $this->respond([
                    'success' => true,
                    'data' => $parkings,
                    'pagination' => [
                        'total' => $total,
                        'page' => $page,
                        'limit' => $limit,
                        'total_pages' => $totalPages
                    ]
                ]);
                break;

            case 'POST':
                $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
                $isMultipart = stripos($contentType, 'multipart/form-data') !== false;

                if ($isMultipart) {
                    $data = $_POST;
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                }

                if (!is_array($data)) {
                    $data = [];
                }

                $uploadedImages = $_FILES['parking_images'] ?? null;
                $userId = AuthMiddleware::obtenirIdUsuari();

                if ($action === 'create') {
                    $this->handleCreate($data, $uploadedImages, $userId);
                } elseif ($action === 'update') {
                    $id = $_GET['id'] ?? null;
                    $this->handleUpdate($id, $data, $uploadedImages, $userId);
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

    private function handleCreate($data, $uploadedImages = null, $userId = null)
    {
        if (empty($data['nom']) || empty($data['tipus']) || empty($data['adreca']) || empty($data['latitud']) || empty($data['longitud'])) {
            $this->respond(['success' => false, 'error' => 'Falten dades obligatòries'], 400);
        }

        $result = $this->model->createAparcament($data, $uploadedImages, $userId);
        if ($result) {
            $this->respond(['success' => true, 'message' => 'Aparcament creat correctament', 'id' => $result]);
        } else {
            $this->respond(['success' => false, 'errors' => $this->model->getErrors()], 500);
        }
    }

    private function handleUpdate($id, $data, $uploadedImages = null, $userId = null)
    {
        if (!$id) {
            $this->respond(['success' => false, 'error' => 'ID d\'aparcament no proporcionat'], 400);
        }

        $result = $this->model->updateAparcament($id, $data, $uploadedImages, $userId);
        if ($result) {
            $this->respond(['success' => true, 'message' => 'Aparcament actualitzat correctament']);
        } else {
            $this->respond(['success' => false, 'errors' => $this->model->getErrors()], 500);
        }
    }

    private function handleDelete($id)
    {
        if (!$id) {
            $this->respond(['success' => false, 'error' => 'ID d\'aparcament no proporcionat'], 400);
        }

        $result = $this->model->deleteAparcament($id);
        if ($result) {
            $this->respond(['success' => true, 'message' => 'Aparcament eliminat correctament']);
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

if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    new AdminAparcamentController();
}
