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
     * @param string $email Email de l'usuari
     * @param string $contrasenyaActual Contrasenya actual
     * @param string $contrasenyaNova Nova contrasenya
     * @param string $contrasenyaConfirmar Confirmació de la nova contrasenya
     * @return bool
     */
    public function canviarContrasenya($email, $contrasenyaNova, $contrasenyaConfirmar)
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

        // Connexió a la base de dades
        if (!$this->conectarBaseDades()) {
            return false;
        }

        // Obtenir usuari per email
        $usuari = $this->obtenirUsuariPerEmail($email);

        if (!$usuari) {
            $this->errors[] = "Usuari no trobat";
            return false;
        }



        // Verificar que la nova contrasenya és diferent de l'actual
        if (password_verify($contrasenyaNova, $usuari['contrasenya'])) {
            $this->errors[] = "La nova contrasenya ha de ser diferent de l'actual";
            return false;
        }

        // Actualitzar contrasenya
        $contrasenyaHash = password_hash($contrasenyaNova, PASSWORD_BCRYPT);
        $resultat = $this->actualitzarContrasenya($email, $contrasenyaHash);

        if (!$resultat) {
            $this->errors[] = "Error en actualitzar la contrasenya. Intenta de nou.";
            return false;
        }

        return true;
    }

    /**
     * Obté les dades de l'usuari per email
     */
    private function obtenirUsuariPerEmail($email)
    {
        $stmt = $this->conexio->prepare(
            "SELECT id, email, contrasenya FROM usuaris WHERE email = ? LIMIT 1"
        );

        if (!$stmt) {
            $this->errors[] = 'Error en la preparació de la consulta: ' . $this->conexio->error;
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
     * Actualitza la contrasenya en la base de dades
     */
    private function actualitzarContrasenya($email, $contrasenyaHash)
    {
        $stmt = $this->conexio->prepare(
            "UPDATE usuaris SET contrasenya = ? WHERE email = ?"
        );

        if (!$stmt) {
            $this->errors[] = 'Error en la preparació de la consulta: ' . $this->conexio->error;
            return false;
        }

        $stmt->bind_param('ss', $contrasenyaHash, $email);
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
            $db = 'parklive_db';
            $user = 'root';
            $password = 'root_password_123';

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
