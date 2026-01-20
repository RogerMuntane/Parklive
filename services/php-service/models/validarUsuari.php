<?php

class validarUsuari
{
    private $errors = array();

    public function __construct() {}

    public function validarNom($nom)
    {
        if (empty($nom)) {
            $this->errors[] = "El nom és obligatori";
            return false;
        }

        if (strlen($nom) < 3) {
            $this->errors[] = "El nom ha de tenir almenys 3 caràcters";
            return false;
        }

        if (strlen($nom) > 50) {
            $this->errors[] = "El nom no pot superar 50 caràcters";
            return false;
        }

        if (!preg_match("/^[a-zA-ZáéíóúàèìòùAÉÍÓÚÀÈÌÒÙäëïöüÄËÏÖÜ\s'-]+$/", $nom)) {
            $this->errors[] = "El nom conté caràcters no vàlids";
            return false;
        }

        return true;
    }

    public function validarCognom($cognom)
    {
        if (empty($cognom)) {
            $this->errors[] = "El cognom és obligatori";
            return false;
        }

        if (strlen($cognom) < 3) {
            $this->errors[] = "El cognom ha de tenir almenys 3 caràcters";
            return false;
        }

        if (strlen($cognom) > 100) {
            $this->errors[] = "El cognom no pot superar 100 caràcters";
            return false;
        }

        if (!preg_match("/^[a-zA-ZáéíóúàèìòùAÉÍÓÚÀÈÌÒÙäëïöüÄËÏÖÜ\s'-]+$/", $cognom)) {
            $this->errors[] = "El cognom conté caràcters no vàlids";
            return false;
        }

        return true;
    }

    public function validarEmail($email)
    {
        if (empty($email)) {
            $this->errors[] = "L'email és obligatori";
            return false;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->errors[] = "L'email no és vàlid";
            return false;
        }

        if (strlen($email) > 100) {
            $this->errors[] = "L'email no pot superar 100 caràcters";
            return false;
        }

        return true;
    }

    public function validarContrasenya($contrasenya1, $contrasenya2)
    {
        if (empty($contrasenya1)) {
            $this->errors[] = "La contrasenya és obligatòria";
            return false;
        }

        if (empty($contrasenya2)) {
            $this->errors[] = "Ha de confirmar la contrasenya";
            return false;
        }

        if ($contrasenya1 !== $contrasenya2) {
            $this->errors[] = "Les contrasenyes no coincideixen";
            return false;
        }

        if (strlen($contrasenya1) < 8) {
            $this->errors[] = "La contrasenya ha de tenir almenys 8 caràcters";
            return false;
        }

        if (strlen($contrasenya1) > 128) {
            $this->errors[] = "La contrasenya no pot superar 128 caràcters";
            return false;
        }

        if (!preg_match("/[A-Z]/", $contrasenya1)) {
            $this->errors[] = "La contrasenya ha de contenir almenys una majúscula";
            return false;
        }

        if (!preg_match("/[a-z]/", $contrasenya1)) {
            $this->errors[] = "La contrasenya ha de contenir almenys una minúscula";
            return false;
        }

        if (!preg_match("/[0-9]/", $contrasenya1)) {
            $this->errors[] = "La contrasenya ha de contenir almenys un número";
            return false;
        }

        return true;
    }

    public function validarTelefono($telefono)
    {
        if (empty($telefono)) {
            $this->errors[] = "El telèfon és obligatori";
            return false;
        }

        if (!preg_match("/^[0-9]{9}$/", $telefono)) {
            $this->errors[] = "El telèfon ha de tenir 9 dígits";
            return false;
        }

        return true;
    }

    public function validarTots($nom, $cognom, $email, $contrasenya1, $contrasenya2, $telefono)
    {
        $esValid = true;

        if (!$this->validarNom($nom)) {
            $esValid = false;
        }

        if (!$this->validarCognom($cognom)) {
            $esValid = false;
        }

        if (!$this->validarEmail($email)) {
            $esValid = false;
        }

        if (!$this->validarContrasenya($contrasenya1, $contrasenya2)) {
            $esValid = false;
        }

        if (!$this->validarTelefono($telefono)) {
            $esValid = false;
        }

        return $esValid;
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function clearErrors()
    {
        $this->errors = array();
    }
}
