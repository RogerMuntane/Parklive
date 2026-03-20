<?php

require_once __DIR__ . '/DatabaseConnection.php';
require_once __DIR__ . '/validarUsuari.php';

class ResetPasswordModel
{
    private $conexio;
    private $errors = array();
    private $validador;

    public function __construct()
    {
        $this->validador = new validarUsuari();
        $this->conectarBaseDades();
    }

    private function conectarBaseDades()
    {
        try {
            $this->conexio = DatabaseConnection::create();
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
        }
    }

    public function getUserIdByEmail(string $email): ?int
    {
        $usuari = $this->obtenirUsuariPerEmail($email);
        return $usuari ? (int) $usuari['id'] : null;
    }

    /**
     * Obté les dades de l'usuari per email usant procedure sp_obtenir_usuari_per_email
     */
    private function obtenirUsuariPerEmail($email)
    {
        if (!$this->conexio) {
            $this->errors[] = 'No hi ha connexió amb la base de dades';
            return null;
        }

        $stmt = $this->conexio->prepare("CALL sp_obtenir_usuari_per_email(?)");
        if (!$stmt) {
            $this->errors[] = 'Error en la preparació del procedure: ' . $this->conexio->error;
            return null;
        }

        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $usuari = $result->fetch_assoc();
        $stmt->close();

        return $usuari;
    }

    /**
     * Actualitza la contrasenya en la base de dades usant procedure sp_actualitzar_contrasenya
     */
    private function actualitzarContrasenyaProcedure($email, $contrasenyaHash)
    {
        if (!$this->conexio) {
            $this->errors[] = 'No hi ha connexió amb la base de dades';
            return false;
        }

        $stmt = $this->conexio->prepare("CALL sp_actualitzar_contrasenya(?, ?, @actualitzat, @error)");
        if (!$stmt) {
            $this->errors[] = 'Error en la preparació del procedure: ' . $this->conexio->error;
            return false;
        }

        $stmt->bind_param('ss', $email, $contrasenyaHash);
        $resultat = $stmt->execute();
        $stmt->close();

        // Obtenir els resultats del procedure
        if ($resultat) {
            $queryResult = $this->conexio->query("SELECT @actualitzat as actualitzat, @error as error_msg");
            if ($queryResult) {
                $row = $queryResult->fetch_assoc();
                if (!$row['actualitzat']) {
                    $this->errors[] = $row['error_msg'] ?? 'Error al actualitzar contrasenya';
                    return false;
                }
            }
        }

        return $resultat;
    }

    /**
     * Canvia la contrasenya després de verificar el codi de reset (RESET FLOW)
     * No requereix contrasenya actual perquè ja s'ha verificat el codi per email
     */
    public function canviarContrasenyaReset($email, $contrasenyaNova, $contrasenyaConfirmar)
    {
        $this->errors = array();

        // Validacions
        if (!$this->validador->validarEmail($email)) {
            $this->errors = array_merge($this->errors, $this->validador->getErrors());
        }
        $this->validador->clearErrors();

        if (!$this->validador->validarContrasenya($contrasenyaNova, $contrasenyaConfirmar)) {
            $this->errors = array_merge($this->errors, $this->validador->getErrors());
        }
        $this->validador->clearErrors();

        if (!empty($this->errors)) {
            return false;
        }

        // Obtenir usuari per email
        $usuari = $this->obtenirUsuariPerEmail($email);
        if (!$usuari) {
            $this->errors[] = "Usuari no trobat";
            return false;
        }

        // Encriptar i actualitzar contrasenya
        $contrasenyaHash = password_hash($contrasenyaNova, PASSWORD_BCRYPT);
        return $this->actualitzarContrasenyaProcedure($email, $contrasenyaHash);
    }

    public function marcarCodiComUsat(?int $registreId): bool
    {
        if (!$this->conexio || !$registreId) {
            return false;
        }

        $stmt = $this->conexio->prepare(
            'UPDATE codis_reset_contrasenya SET used = 1, used_at = UTC_TIMESTAMP() WHERE id = ?'
        );

        if (!$stmt) {
            $this->errors[] = 'No s\'ha pogut preparar l\'actualització del codi';
            return false;
        }

        $stmt->bind_param('i', $registreId);
        $stmt->execute();
        $affected = $stmt->affected_rows > 0;
        $stmt->close();

        return $affected;
    }

    public function obtenirCodiResetPerId(?int $registreId, ?int $usuariId = null): ?array
    {
        if (!$this->conexio || !$registreId) {
            return null;
        }

        if ($usuariId) {
            $stmt = $this->conexio->prepare(
                'SELECT id, usuari_id, code_hash, expires_at, used, used_at, created_at FROM codis_reset_contrasenya WHERE id = ? AND usuari_id = ? LIMIT 1'
            );
        } else { //Revisar
            $stmt = $this->conexio->prepare(
                'SELECT id, usuari_id, code_hash, expires_at, used, used_at, created_at FROM codis_reset_contrasenya WHERE id = ? LIMIT 1'
            );
        }

        if (!$stmt) {
            $this->errors[] = 'Error en preparar la consulta de codi de reset: ' . $this->conexio->error;
            return null;
        }

        if ($usuariId) {
            $stmt->bind_param('ii', $registreId, $usuariId);
        } else {
            $stmt->bind_param('i', $registreId);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $stmt->close();

        return $row ?: null;
    }

    public function getErrors(): array
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
