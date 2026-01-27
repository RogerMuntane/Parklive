<?php

require_once __DIR__ . '/DatabaseConnection.php';
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
     * Obté les dades de l'usuari per email usant procedure sp_obtenir_usuari_per_email
     */
    private function obtenirUsuariPerEmail($email)
    {
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
    private function actualitzarContrasenya($email, $contrasenyaHash)
    {
        $stmt = $this->conexio->prepare("CALL sp_actualitzar_contrasenya(?, ?, @actualitzat, @error)");

        if (!$stmt) {
            $this->errors[] = 'Error en la preparació del procedure: ' . $this->conexio->error;
            return false;
        }

        $stmt->bind_param('ss', $email, $contrasenyaHash);
        $resultat = $stmt->execute();
        $stmt->close();

        // Obtenir els resultats del procedure
        $queryResult = $this->conexio->query("SELECT @actualitzat as actualitzat, @error as error_msg");
        if ($queryResult) {
            $row = $queryResult->fetch_assoc();
            if (!$row['actualitzat']) {
                $this->errors[] = $row['error_msg'] ?? 'Error al actualitzar contrasenya';
                return false;
            }
        }

        return $resultat;
    }

    /**
     * Connecta amb la base de dades
     */
    private function conectarBaseDades()
    {
        try {
            $this->conexio = DatabaseConnection::create();
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
