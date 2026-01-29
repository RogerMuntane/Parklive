<?php

require_once __DIR__ . '/DatabaseConnection.php';

class ResetPasswordModel
{
    private $conexio;
    private $errors = array();

    public function __construct()
    {
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
        if (!$this->conexio) {
            $this->errors[] = 'No hi ha connexió amb la base de dades';
            return null;
        }

        $stmt = $this->conexio->prepare('SELECT id FROM usuaris WHERE email = ? LIMIT 1');
        if (!$stmt) {
            $this->errors[] = 'Error en preparar la consulta: ' . $this->conexio->error;
            return null;
        }

        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $stmt->close();

        if (!$row) {
            return null;
        }

        return (int) $row['id'];
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
