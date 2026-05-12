<?php

/**
 * Class validarUsuari
 * 
 * Proporciona mètodes per validar les dades d'entrada dels usuaris (nom, email, contrasenya, etc.).
 */
class validarUsuari
{
    /** @var array Llista d'errors de validació acumulats */
    private $errors = array();

    /**
     * validarUsuari constructor.
     */
    public function __construct() {}

    /**
     * Valida el nom de l'usuari.
     * 
     * @param string $nom El nom a validar.
     * @return bool Retorna true si el nom és vàlid, false en cas contrari.
     */
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

    /**
     * Valida el cognom de l'usuari.
     * 
     * @param string $cognom El cognom a validar.
     * @return bool Retorna true si el cognom és vàlid, false en cas contrari.
     */
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

    /**
     * Valida l'email de l'usuari.
     * 
     * @param string $email L'email a validar.
     * @return bool Retorna true si l'email és vàlid, false en cas contrari.
     */
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

    /**
     * Valida la contrasenya de l'usuari i la seva confirmació.
     * 
     * @param string $contrasenya1 La contrasenya principal.
     * @param string $contrasenya2 La confirmació de la contrasenya.
     * @return bool Retorna true si la contrasenya és vàlida i coincideixen, false en cas contrari.
     */
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

    /**
     * Valida el format de la contrasenya per al login.
     * 
     * @param string $contrasenya La contrasenya a validar.
     * @return bool Retorna true si la contrasenya té un format vàlid per al login.
     */
    public function validarContrasenyaLogin($contrasenya)
    {
        if (empty($contrasenya)) {
            $this->errors[] = "La contrasenya és obligatòria";
            return false;
        }

        if (strlen($contrasenya) < 8) {
            $this->errors[] = "La contrasenya ha de tenir almenys 8 caràcters";
            return false;
        }

        if (strlen($contrasenya) > 128) {
            $this->errors[] = "La contrasenya no pot superar 128 caràcters";
            return false;
        }

        return true;
    }

    /**
     * Valida el número de telèfon.
     * 
     * @param string $telefono El número de telèfon a validar.
     * @return bool Retorna true si el telèfon és vàlid o està buit, false en cas contrari.
     */
    public function validarTelefono($telefono)
    {
        // El telèfon és opcional; si s'omple, ha de tenir exactament 9 dígits
        if (empty($telefono)) {
            return true;
        }

        if (!preg_match("/^[0-9]{9}$/", $telefono)) {
            $this->errors[] = "El telèfon ha de tenir 9 dígits";
            return false;
        }

        return true;
    }

    /**
     * Valida totes les dades d'un formulari de registre.
     * 
     * @param string $nom Nom de l'usuari.
     * @param string $cognom Cognom de l'usuari.
     * @param string $email Email de l'usuari.
     * @param string $contrasenya1 Contrasenya principal.
     * @param string $contrasenya2 Confirmació de la contrasenya.
     * @param string $telefono Telèfon de l'usuari.
     * @return bool Retorna true si totes les dades són vàlides, false si n'hi ha alguna d'incorrecta.
     */
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

    /**
     * Obté la llista d'errors de validació acumulats.
     * 
     * @return array Llista d'errors.
     */
    public function getErrors()
    {
        return $this->errors;
    }

    /**
     * Neteja la llista d'errors acumulats.
     * 
     * @return void
     */
    public function clearErrors()
    {
        $this->errors = array();
    }
}

