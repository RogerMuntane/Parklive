<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    /**
     * Genera un token JWT per a un usuari donat.
     * 
     * @param array $user Dades de l'usuari (minim id, nom, email, tipus_usuari)
     * @return string El token JWT generat
     */
    public static function generateToken($user)
    {
        $secretKey = getenv('JWT_SECRET');
        if (!$secretKey) {
            // Fallback només per evitar errors fatals si la variable d'entorn no està carregada,
            // tot i que en producció s'hauria d'assegurar que existeix.
            $secretKey = 'default_secret_key_needs_to_be_replaced';
        }

        $issuedAt   = time();
        $expire     = $issuedAt + 3600; // Validesa: 1 hora
        $serverName = $_SERVER['SERVER_NAME'] ?? 'parklive.local';

        $data = [
            'iat'  => $issuedAt,         // Issued at: temps en què es genera el token
            'iss'  => $serverName,       // Issuer
            'nbf'  => $issuedAt,         // Not before
            'exp'  => $expire,           // Expiration time
            'sub'  => $user['id'],       // Subject (ID de l'usuari)
            'data' => [                  // Dades útils
                'id' => $user['id'],
                'nom' => $user['nom'] ?? '',
                'email' => $user['email'] ?? '',
                'tipus_usuari' => $user['tipus_usuari'] ?? 'basic'
            ]
        ];

        return JWT::encode($data, $secretKey, 'HS256');
    }

    /**
     * Valida un token JWT i retorna les dades si és vàlid.
     * 
     * @param string $jwt El token JWT a validar
     * @return object|null Les dades del token si és vàlid, null si no ho és
     */
    public static function validateToken($jwt)
    {
        $secretKey = getenv('JWT_SECRET');
        if (!$secretKey) {
            $secretKey = 'default_secret_key_needs_to_be_replaced';
        }

        try {
            $decoded = JWT::decode($jwt, new Key($secretKey, 'HS256'));
            return $decoded->data;
        } catch (Exception $e) {
            // Error de validació (caducat, signatura invàlida, etc.)
            return null;
        }
    }
}
