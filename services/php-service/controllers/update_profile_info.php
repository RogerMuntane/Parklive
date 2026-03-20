<?php
session_start();
require_once "../models/DatabaseConnection.php";
require_once "../models/sessionModel.php";
require_once "../models/validarUsuari.php";
require_once "../models/loginModel.php";

class UpdateProfileInfoController
{
    private $conexio;

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

        // Intentar autenticació via sessió PHP
        SessionModel::iniciarSessio();
        $userId = null;

        if (SessionModel::estaAutenticat()) {
            $userId = SessionModel::obtenirIdUsuari();
        }

        // Si no hi ha sessió PHP, intentar via user_id del cos de la petició
        // (per a usuaris OAuth que no tenen sessió PHP)
        if (!$userId) {
            $userId = intval($_POST['user_id'] ?? 0);
            if (!$userId) {
                $this->respond(['success' => false, 'error' => 'No autenticat'], 401);
            }
        }

        $nom    = trim($_POST['nom'] ?? '');
        $cognom = trim($_POST['cognom'] ?? '');
        $email  = trim($_POST['email'] ?? '');
        $telefon = trim($_POST['telefon'] ?? '');

        // Validació bàsica
        $errors = [];
        if (empty($nom))   $errors[] = 'El nom és obligatori.';
        if (empty($cognom)) $errors[] = 'El cognom és obligatori.';
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'El correu electrònic no és vàlid.';
        }
        if (!empty($telefon) && !preg_match('/^[+\d\s]{7,20}$/', $telefon)) {
            $errors[] = 'El telèfon no és vàlid.';
        }

        if ($errors) {
            $this->respond(['success' => false, 'errors' => $errors], 400);
        }

        // Actualitzar a la base de dades
        try {
            $this->conexio = DatabaseConnection::create();
            $stmt = $this->conexio->prepare(
                "UPDATE usuaris SET nom = ?, cognoms = ?, email = ?, telefon = ? WHERE id = ?"
            );
            if (!$stmt) {
                $this->respond(['success' => false, 'error' => 'Error en la consulta'], 500);
            }
            $stmt->bind_param('ssssi', $nom, $cognom, $email, $telefon, $userId);
            $ok = $stmt->execute();
            $stmt->close();
            $this->conexio->close();

            if (!$ok) {
                $this->respond(['success' => false, 'error' => 'No s\'ha pogut actualitzar el perfil.'], 500);
            }

            // Actualitzar la sessió PHP si existeix
            if (SessionModel::estaAutenticat()) {
                $_SESSION['user']['nom']   = $nom;
                $_SESSION['user']['cognom'] = $cognom;
                $_SESSION['user']['email'] = $email;
            }

            $this->respond([
                'success' => true,
                'message' => 'Perfil actualitzat correctament.',
                'data' => ['nom' => $nom, 'cognom' => $cognom, 'email' => $email, 'telefon' => $telefon]
            ]);
        } catch (Exception $e) {
            $this->respond(['success' => false, 'error' => $e->getMessage()], 500);
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
    new UpdateProfileInfoController();
}
