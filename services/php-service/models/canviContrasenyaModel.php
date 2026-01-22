<?php

require_once "validarUsuari.php";

class CanviContrasenyaModel
{
    private $validador;
    private $errors = array();
    private $conexio;

    public function __construct()
    {
        $this->validador = new validarUsuari();
    }

    /**
     * Valida i canvia la contrasenya d'un usuari
     * @param int $usuariId ID de l'usuari
     * @param string $email Email de l'usuari
     * @param string $contrasenyaActual Contrasenya actual
     * @param string $contrasenyaNova Nova contrasenya
     * @param string $contrasenyaConfirmar Confirmació de la nova contrasenya
     * @return bool
     */
    public function canviarContrasenya($usuariId, $email, $contrasenyaActual, $contrasenyaNova, $contrasenyaConfirmar)
    {
        $this->errors = array();

        // Validacions
        if (!$this->validador->validarEmail($email)) {
            $this->errors = array_merge($this->errors, $this->validador->getErrors());
        }
        $this->validador->clearErrors();

        if (empty($contrasenyaActual)) {
            $this->errors[] = "La contrasenya actual és obligatòria";
        }

        if (!$this->validador->validarContrasenya($contrasenyaNova, $contrasenyaConfirmar)) {
            $this->errors = array_merge($this->errors, $this->validador->getErrors());
        }
        $this->validador->clearErrors();

        if (!empty($this->errors)) {
            return false;
        }

        // Connexió a la base de dades
        if (!$this->conectarBaseDades()) {
            return false;
        }

        // Obtenir usuari actual
        $usuari = $this->obtenirUsuariPerId($usuariId);

        if (!$usuari) {
            $this->errors[] = "Usuari no trobat";
            return false;
        }

        // Verificar que l'email coincideix
        if ($usuari['email'] !== $email) {
            $this->errors[] = "L'email no coincideix amb el del compte";
            return false;
        }

        // Verificar que la contrasenya actual és correcta
        if (!password_verify($contrasenyaActual, $usuari['contrasenya'])) {
            $this->errors[] = "La contrasenya actual és incorrecta";
            return false;
        }

        // Verificar que la nova contrasenya és diferent de l'actual
        if ($contrasenyaActual === $contrasenyaNova) {
            $this->errors[] = "La nova contrasenya ha de ser diferent de l'actual";
            return false;
        }

        // Actualitzar contrasenya
        $contrasenyaHash = password_hash($contrasenyaNova, PASSWORD_BCRYPT);
        $resultat = $this->actualitzarContrasenya($usuariId, $contrasenyaHash);

        if (!$resultat) {
            $this->errors[] = "Error en actualitzar la contrasenya. Intenta de nou.";
            return false;
        }

        return true;
    }

    /**
     * Obté les dades de l'usuari per ID
     */
    private function obtenirUsuariPerId($usuariId)
    {
        $stmt = $this->conexio->prepare(
            "SELECT id, email, contrasenya FROM usuaris WHERE id = ? LIMIT 1"
        );

        if (!$stmt) {
            $this->errors[] = 'Error en la preparació de la consulta: ' . $this->conexio->error;
            return null;
        }

        $stmt->bind_param('i', $usuariId);
        $stmt->execute();
        $result = $stmt->get_result();
        $usuari = $result->fetch_assoc();
        $stmt->close();

        return $usuari;
    }

    /**
     * Actualitza la contrasenya en la base de dades
     */
    private function actualitzarContrasenya($usuariId, $contrasenyaHash)
    {
        $stmt = $this->conexio->prepare(
            "UPDATE usuaris SET contrasenya = ? WHERE id = ?"
        );

        if (!$stmt) {
            $this->errors[] = 'Error en la preparació de la consulta: ' . $this->conexio->error;
            return false;
        }

        $stmt->bind_param('si', $contrasenyaHash, $usuariId);
        $resultat = $stmt->execute();
        $stmt->close();

        return $resultat;
    }

    /**
     * Connecta amb la base de dades
     */
    private function conectarBaseDades()
    {
        try {
            $host = 'localhost';
            $db = 'parklive';
            $user = 'root';
            $password = '';

            $this->conexio = new mysqli($host, $user, $password, $db);

            if ($this->conexio->connect_error) {
                throw new Exception('Error de connexió: ' . $this->conexio->connect_error);
            }

            $this->conexio->set_charset('utf8');
            return true;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    /**
     * Obté els errors de validació
     */
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
