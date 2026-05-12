<?php

require_once __DIR__ . '/DatabaseConnection.php';
require_once "validarUsuari.php";

/**
 * Class LoginModel
 * 
 * Gestiona les operacions d'autenticació i gestió de credencials d'usuaris.
 */
class LoginModel
{
    /** @var validarUsuari Objecte validador per comprovar dades d'entrada */
    private $validador;

    /** @var array Llista d'errors produïts durant les operacions */
    private $errors = array();

    /** @var mysqli|null La connexió a la base de dades */
    private $conexio;

    /**
     * LoginModel constructor.
     * Inicialitza el validador d'usuaris.
     */
    public function __construct()
    {
        $this->validador = new validarUsuari();
    }

    /**
     * Autentica un usuari comprovant el seu email i contrasenya.
     * 
     * @param string $email Email de l'usuari.
     * @param string $contrasenya Contrasenya en text pla.
     * @return array|null Retorna les dades de l'usuari si l'autenticació és correcta, null en cas contrari.
     */
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

    /**
     * Estableix la connexió amb la base de dades.
     * 
     * @return bool Retorna true si s'ha connectat correctament, false en cas contrari.
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
     * Obté les dades d'un usuari mitjançant el seu email.
     * 
     * @param string $email Email de l'usuari.
     * @return array|null Retorna les dades de l'usuari o null si no es troba.
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
     * Obté l'usuari pel seu ID.
     * 
     * @param int $id ID de l'usuari.
     * @return array|null Dades de l'usuari o null.
     */
    public function getUserById($id)
    {
        if (!$this->conexio) {
            $this->conectarBaseDades();
        }
        $stmt = $this->conexio->prepare("SELECT * FROM usuaris WHERE id = ? LIMIT 1");
        if (!$stmt) return null;
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $usuari = $result->fetch_assoc();
        $stmt->close();
        return $usuari;
    }

    /**
     * Actualitza la contrasenya d'un usuari per ID.
     * 
     * @param int $id ID de l'usuari.
     * @param string $hashNova Nou hash de la contrasenya.
     * @return bool Retorna true si s'ha actualitzat correctament, false si no.
     */
    public function updatePassword($id, $hashNova)
    {
        if (!$this->conexio) {
            $this->conectarBaseDades();
        }
        // Obtenir email per ID
        $user = $this->getUserById($id);
        if (!$user || empty($user['email'])) return false;
        $email = $user['email'];
        // Cridar procedure d'actualització
        $stmt = $this->conexio->prepare("CALL sp_actualitzar_contrasenya(?, ?, @actualitzat, @error_msg)");
        if (!$stmt) return false;
        $stmt->bind_param('ss', $email, $hashNova);
        $ok = $stmt->execute();
        $stmt->close();
        // Comprovar resultat
        $result = $this->conexio->query("SELECT @actualitzat as actualitzat, @error_msg as error_msg");
        if ($result) {
            $row = $result->fetch_assoc();
            if (!$row['actualitzat']) {
                $this->errors[] = $row['error_msg'] ?? 'Error al actualitzar contrasenya';
                return false;
            }
        }
        return $ok;
    }

    /**
     * Obté la llista d'errors acumulats.
     * 
     * @return array Llista d'errors.
     */
    public function getErrors()
    {
        return $this->errors;
    }

    /**
     * LoginModel destructor.
     * Tanca la connexió a la base de dades si està oberta.
     */
    public function __destruct()
    {
        if ($this->conexio) {
            $this->conexio->close();
        }
    }
}

