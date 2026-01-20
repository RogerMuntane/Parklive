<?php

class guardarUsuari
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
            // Configuració de la base de dades
            $host = 'localhost';
            $db = 'parklive';
            $user = 'root';
            $password = '';

            $this->conexio = new mysqli($host, $user, $password, $db);

            if ($this->conexio->connect_error) {
                throw new Exception('Error de connexió: ' . $this->conexio->connect_error);
            }

            $this->conexio->set_charset('utf8');
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
        }
    }

    public function guardarUsuari($nom, $cognom, $email, $contrasenya, $telefono)
    {
        try {
            // Verificar si l'email ja existeix
            if ($this->emailExisteix($email)) {
                $this->errors[] = "Ja existeix un usuari amb aquest email";
                return false;
            }

            // Encriptar la contrasenya
            $contrasenhaHash = password_hash($contrasenya, PASSWORD_BCRYPT);

            // Preparar la consulta
            $stmt = $this->conexio->prepare(
                "INSERT INTO usuaris (nom, cognom, email, contrasenya, telefono, data_registre) 
                 VALUES (?, ?, ?, ?, ?, NOW())"
            );

            if (!$stmt) {
                throw new Exception('Error en la preparació de la consulta: ' . $this->conexio->error);
            }

            // Vincular paràmetres
            $stmt->bind_param(
                'sssss',
                $nom,
                $cognom,
                $email,
                $contrasenhaHash,
                $telefono
            );

            // Executar la consulta
            if ($stmt->execute()) {
                $stmt->close();
                return true;
            } else {
                throw new Exception('Error al guardar l\'usuari: ' . $stmt->error);
            }
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    private function emailExisteix($email)
    {
        try {
            $stmt = $this->conexio->prepare("SELECT id FROM usuaris WHERE email = ?");

            if (!$stmt) {
                throw new Exception('Error en la preparació de la consulta: ' . $this->conexio->error);
            }

            $stmt->bind_param('s', $email);
            $stmt->execute();
            $result = $stmt->get_result();
            $stmt->close();

            return $result->num_rows > 0;
            return true;
        } catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
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
