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
        $this->conectarBaseDades();
    }

    /**
     * Connecta amb la base de dades
     */
    private function conectarBaseDades()
    {
        try {
            $this->conexio = DatabaseConnection::create();
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
        }
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
     * Valida i canvia la contrasenya d'un usuari (per a canvi manual)
     * Requiere que l'usuari proporcioni la contrasenya actual per verificació
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

        // Obtenir usuari per email
        $usuari = $this->obtenirUsuariPerEmail($email);
        if (!$usuari) {
            $this->errors[] = "Usuari no trobat";
            return false;
        }

        // Verificar que la nova contrasenya és diferent de l'actual
        if (password_verify($contrasenyaNova, $usuari['contrasenya_hash'])) {
            $this->errors[] = "La nova contrasenya ha de ser diferent de l'actual";
            return false;
        }

        // Actualitzar contrasenya
        $contrasenyaHash = password_hash($contrasenyaNova, PASSWORD_BCRYPT);
        return $this->actualitzarContrasenyaProcedure($email, $contrasenyaHash);
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
