<?php

require_once __DIR__ . '/../models/JwtService.php';

/**
 * Middleware per protegir rutes que requereixen autenticació
 * Aquest middleware és 100% stateless i funciona exclusivament amb JWT.
 */
class AuthMiddleware
{
    /**
     * Verifica que l'usuari estigui autenticat
     * Si no ho està, retorna 401 Unauthorized
     */
    public static function verificarAutenticacio()
    {
        if (!self::estaAutenticat()) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'No autenticat o token invàlid']);
            exit();
        }
    }

    /**
     * Verifica que l'usuari NO estigui autenticat
     */
    public static function verificarNoAutenticat()
    {
        if (self::estaAutenticat()) {
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'already_authenticated' => true]);
            exit();
        }
    }

    /**
     * Verifica que l'usuari autenticat sigui el propietari del recurs
     * @param int $userId ID de l'usuari propietari del recurs
     * @param string $errorMessage Missatge d'error personalitzat
     * @return bool
     */
    public static function verificarPropietari($userId, $errorMessage = 'No tens permís per accedir a aquest recurs')
    {
        self::verificarAutenticacio();

        $usuariAutenticat = self::obtenirIdUsuari();

        if ($usuariAutenticat !== (int)$userId) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => $errorMessage]);
            exit();
        }

        return true;
    }

    /**
     * Obté l'usuari autenticat decodificant el JWT
     * @return array|null Dades de l'usuari o null si no està autenticat
     */
    public static function obtenirUsuariAutenticat()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (strpos($authHeader, 'Bearer ') === 0) {
            $jwt = substr($authHeader, 7);
            $userData = JwtService::validateToken($jwt);
            if ($userData) {
                return (array)$userData;
            }
        }
        
        return null;
    }

    /**
     * Obté l'ID de l'usuari autenticat actual
     * @return int|null L'ID de l'usuari o null si no està autenticat
     */
    public static function obtenirIdUsuari()
    {
        $usuari = self::obtenirUsuariAutenticat();
        return $usuari ? (int)$usuari['id'] : null;
    }

    /**
     * Comprova si l'usuari està autenticat validant el token JWT
     * @return bool
     */
    public static function estaAutenticat()
    {
        return self::obtenirUsuariAutenticat() !== null;
    }
}
