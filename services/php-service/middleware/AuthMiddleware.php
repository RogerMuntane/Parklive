<?php

require_once __DIR__ . '/../models/sessionModel.php';

/**
 * Middleware per protegir rutes que requereixen autenticació
 */
class AuthMiddleware
{
    /**
     * Verifica que l'usuari estigui autenticat
     * Si no ho està, redirigeix al login
     * @param string $redirectUrl URL de redirecció personalitzada (opcional)
     */
    public static function verificarAutenticacio($redirectUrl = null)
    {
        if ($redirectUrl === null) {
            $redirectUrl = '/services/php-service/views/login.php';
        }

        SessionModel::requerirAutenticacio($redirectUrl);
    }

    /**
     * Verifica que l'usuari NO estigui autenticat
     * Si ja està autenticat, redirigeix al dashboard
     * Útil per pàgines com login o registre
     * @param string $redirectUrl URL de redirecció si ja està autenticat
     */
    public static function verificarNoAutenticat($redirectUrl = '/services/php-service/views/dashboard.php')
    {
        if (SessionModel::estaAutenticat()) {
            header('Location: ' . $redirectUrl);
            exit();
        }
    }

    /**
     * Verifica que l'usuari autenticat sigui el propietari del recurs
     * @param int $userId ID de l'usuari propietari del recurs
     * @param string $errorMessage Missatge d'error personalitzat
     * @param string $redirectUrl URL de redirecció si no és el propietari
     * @return bool
     */
    public static function verificarPropietari($userId, $errorMessage = 'No tens permís per accedir a aquest recurs', $redirectUrl = '/services/php-service/views/dashboard.php')
    {
        self::verificarAutenticacio();

        $usuariAutenticat = SessionModel::obtenirIdUsuari();

        if ($usuariAutenticat !== (int)$userId) {
            SessionModel::setFlashMessage('error', $errorMessage);
            header('Location: ' . $redirectUrl);
            exit();
        }

        return true;
    }

    /**
     * Obté l'usuari autenticat
     * @return array|null Dades de l'usuari o null si no està autenticat
     */
    public static function obtenirUsuariAutenticat()
    {
        return SessionModel::obtenirUsuari();
    }

    /**
     * Comprova si l'usuari està autenticat (sense redirigir)
     * @return bool
     */
    public static function estaAutenticat()
    {
        return SessionModel::estaAutenticat();
    }
}
