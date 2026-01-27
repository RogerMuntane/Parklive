<?php

require_once __DIR__ . '/DatabaseConnection.php';
require_once "validarUsuari.php";

class LoginModel
{
    private $validador;
    private $errors = array();
    private $conexio;

    public function __construct()
    {
        $this->validador = new validarUsuari();
    }

    public function autenticar($email, $contrasenya)
    {
        $this->errors = array();

        if (!$this->validador->validarEmail($email)) {
            $this->errors = array_merge($this->errors, $this->validador->getErrors());
        }
        $this->validador->clearErrors();

        if (!$this->validador->validarContrasenyaLogin($contrasenya)) {
            $this->errors = array_merge($this->errors, $this->validador->getErrors());
        }
        $this->validador->clearErrors();

        if (!empty($this->errors)) {
            return null;
        }

        if (!$this->conectarBaseDades()) {
            return null;
        }

        $usuari = $this->obtenirUsuariPerEmail($email);

        if (!$usuari || !password_verify($contrasenya, $usuari['contrasenya_hash'])) {
            $this->errors[] = "Email o contrasenya incorrectes";
            return null;
        }

        return $usuari;
    }

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
