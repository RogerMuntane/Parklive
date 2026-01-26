<?php

/**
 * Model per gestionar les sessions d'usuari
 */
class SessionModel
{
    private const SESSION_KEY = 'user';
    private const SESSION_TIMEOUT = 3600 * 3; // 1 hora en segons
    private const LAST_ACTIVITY_KEY = 'last_activity';

    /**
     * Inicia la sessió si no està iniciada
     */
    public static function iniciarSessio()
    {
        if (session_status() === PHP_SESSION_NONE) {
            // Configuració de seguretat per les sessions
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            ini_set('session.cookie_secure', 1);

            session_start();
        }
    }

    /**
     * Guarda les dades de l'usuari a la sessió
     * @param array $usuari Dades de l'usuari
     */
    public static function guardarUsuari($usuari)
    {
        self::iniciarSessio();

        $_SESSION[self::SESSION_KEY] = [
            'id' => $usuari['id'],
            'nom' => $usuari['nom'],
            'cognom' => $usuari['cognom'],
            'email' => $usuari['email']
        ];

        $_SESSION[self::LAST_ACTIVITY_KEY] = time();

        // Regenerar l'ID de sessió per seguretat
        session_regenerate_id(true);
    }

    /**
     * Verifica si l'usuari està autenticat
     * @return bool
     */
    public static function estaAutenticat()
    {
        self::iniciarSessio();

        if (!isset($_SESSION[self::SESSION_KEY])) {
            return false;
        }

        // Comprovar timeout de la sessió
        if (self::haCaducatSessio()) {
            self::tancarSessio();
            return false;
        }

        // Actualitzar el temps d'última activitat
        $_SESSION[self::LAST_ACTIVITY_KEY] = time();

        return true;
    }

    /**
     * Comprova si la sessió ha caducat per inactivitat
     * @return bool
     */
    private static function haCaducatSessio()
    {
        if (!isset($_SESSION[self::LAST_ACTIVITY_KEY])) {
            return true;
        }

        $tempsInactiu = time() - $_SESSION[self::LAST_ACTIVITY_KEY];

        return $tempsInactiu > self::SESSION_TIMEOUT;
    }

    /**
     * Obté les dades de l'usuari autenticat
     * @return array|null
     */
    public static function obtenirUsuari()
    {
        self::iniciarSessio();

        if (!self::estaAutenticat()) {
            return null;
        }

        return $_SESSION[self::SESSION_KEY];
    }

    /**
     * Obté l'ID de l'usuari autenticat
     * @return int|null
     */
    public static function obtenirIdUsuari()
    {
        $usuari = self::obtenirUsuari();
        return $usuari ? $usuari['id'] : null;
    }

    /**
     * Obté l'email de l'usuari autenticat
     * @return string|null
     */
    public static function obtenirEmailUsuari()
    {
        $usuari = self::obtenirUsuari();
        return $usuari ? $usuari['email'] : null;
    }

    /**
     * Obté el nom complet de l'usuari autenticat
     * @return string|null
     */
    public static function obtenirNomCompletUsuari()
    {
        $usuari = self::obtenirUsuari();

        if (!$usuari) {
            return null;
        }

        return trim($usuari['nom'] . ' ' . $usuari['cognom']);
    }

    /**
     * Tanca la sessió de l'usuari
     */
    public static function tancarSessio()
    {
        self::iniciarSessio();

        // Netejar totes les variables de sessió
        $_SESSION = array();

        // Destruir la cookie de sessió
        if (isset($_COOKIE[session_name()])) {
            setcookie(
                session_name(),
                '',
                time() - 3600,
                '/'
            );
        }

        // Destruir la sessió
        session_destroy();
    }

    /**
     * Requereix autenticació - redirigeix si no està autenticat
     * @param string $redirectUrl URL de redirecció si no està autenticat
     */
    public static function requerirAutenticacio($redirectUrl = '/services/php-service/views/login.php')
    {
        if (!self::estaAutenticat()) {
            $_SESSION['error_message'] = 'Has d\'iniciar sessió per accedir a aquesta pàgina';
            $_SESSION['redirect_after_login'] = $_SERVER['REQUEST_URI'];
            header('Location: ' . $redirectUrl);
            exit();
        }
    }

    /**
     * Guarda un missatge flash a la sessió
     * @param string $clau Clau del missatge (success, error, info, warning)
     * @param string $missatge Missatge a mostrar
     */
    public static function setFlashMessage($clau, $missatge)
    {
        self::iniciarSessio();
        $_SESSION['flash'][$clau] = $missatge;
    }

    /**
     * Obté i elimina un missatge flash de la sessió
     * @param string $clau Clau del missatge
     * @return string|null
     */
    public static function getFlashMessage($clau)
    {
        self::iniciarSessio();

        if (isset($_SESSION['flash'][$clau])) {
            $missatge = $_SESSION['flash'][$clau];
            unset($_SESSION['flash'][$clau]);
            return $missatge;
        }

        return null;
    }

    /**
     * Comprova si hi ha missatges flash
     * @return bool
     */
    public static function teFlashMessages()
    {
        self::iniciarSessio();
        return isset($_SESSION['flash']) && !empty($_SESSION['flash']);
    }

    /**
     * Obté tots els missatges flash i els elimina
     * @return array
     */
    public static function getAllFlashMessages()
    {
        self::iniciarSessio();

        if (isset($_SESSION['flash'])) {
            $missatges = $_SESSION['flash'];
            unset($_SESSION['flash']);
            return $missatges;
        }

        return [];
    }
}
