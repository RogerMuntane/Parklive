<?php

require_once __DIR__ . '/DatabaseConnection.php';
require_once __DIR__ . '/../vendor/autoload.php';

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
            $this->conexio = DatabaseConnection::create();
        }
        catch (Exception $e) {
            $this->errors[] = $e->getMessage();
        }
    }

    /**
     * Crea un client a Stripe i actualitza el seu stripe_customer_id a la base de dades.
     */
    public function crearUsuariStripe($userId, $email, $nom, $cognom)
    {
        try {
            // Netejar qualsevol resultat pendent del procedure anterior per evitar "Commands out of sync"
            while ($this->conexio->more_results() && $this->conexio->next_result()) {
                if ($extraResult = $this->conexio->store_result()) {
                    $extraResult->free();
                }
            }

            $stripe_secret = $_ENV['STRIPE_APIPrivada'] ?? getenv('STRIPE_APIPrivada') ?? '';
            if (empty($stripe_secret)) {
                error_log("[ParkLive] Avís: STRIPE_APIPrivada no està configurada.");
                return false;
            }

            \Stripe\Stripe::setApiKey($stripe_secret);
            $customer = \Stripe\Customer::create([
                'email' => $email,
                'name' => $nom . ' ' . $cognom,
                'metadata' => ['user_id' => $userId]
            ]);

            if ($customer && isset($customer->id)) {
                $stmt_stripe = $this->conexio->prepare("CALL sp_actualitzar_stripe_customer_id(?, ?)");
                if ($stmt_stripe) {
                    $stmt_stripe->bind_param('is', $userId, $customer->id);
                    if (!$stmt_stripe->execute()) {
                        error_log("[ParkLive] Error executant sp_actualitzar_stripe_customer_id: " . $stmt_stripe->error);
                    }
                    $stmt_stripe->close();
                    return $customer->id;
                }
            }
        }
        catch (\Throwable $e) {
            error_log("[ParkLive] Error Stripe: " . $e->getMessage());
            $this->errors[] = "Error Stripe: " . $e->getMessage();
        }
        return false;
    }

    public function guardarUsuari($nom, $cognom, $email, $contrasenya, $telefono)
    {
        try {
            if (!$this->conexio) {
                throw new Exception('No hi ha connexió amb la base de dades');
            }

            // Encriptar la contrasenya
            $contrasenhaHash = password_hash($contrasenya, PASSWORD_BCRYPT);

            // Executar procedure sp_insertar_usuari
            $stmt = $this->conexio->prepare(
                "CALL sp_insertar_usuari(?, ?, ?, ?, ?, 'basic', @nou_id, @error_msg)"
            );

            if (!$stmt) {
                throw new Exception('Error en la preparació del procedure: ' . $this->conexio->error);
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

            // Executar el procedure
            if ($stmt->execute()) {
                $stmt->close();

                // Obtenir els resultats del procedure
                $result = $this->conexio->query("SELECT @nou_id as nou_id, @error_msg as error_msg");
                if ($result) {
                    $row = $result->fetch_assoc();
                    $nou_id = $row['nou_id'];
                    if ($nou_id === null) {
                        throw new Exception($row['error_msg'] ?? 'Error al guardar l\'usuari');
                    }

                    // Integració Stripe centralitzada
                    $this->crearUsuariStripe($nou_id, $email, $nom, $cognom);

                    return true;
                }
                return true;
            }
            else {
                throw new Exception('Error al executar procedure: ' . $stmt->error);
                $this->errors[] = $stmt->error;

            }
        }
        catch (Exception $e) {
            $this->errors[] = $e->getMessage();
            return false;
        }
    }

    private function emailExisteix($email)
    {
        try {
            if (!$this->conexio) {
                throw new Exception('No hi ha connexió amb la base de dades');
            }

            // Executar procedure sp_comprovar_email_existeix
            $stmt = $this->conexio->prepare("CALL sp_comprovar_email_existeix(?, @existeix)");

            if (!$stmt) {
                throw new Exception('Error en la preparació del procedure: ' . $this->conexio->error);
            }

            $stmt->bind_param('s', $email);
            $stmt->execute();
            $stmt->close();

            // Obtenir el resultat del procedure
            $result = $this->conexio->query("SELECT @existeix as existeix");
            if ($result) {
                $row = $result->fetch_assoc();
                return $row['existeix'] ? true : false;
            }
            return false;
        }
        catch (Exception $e) {
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