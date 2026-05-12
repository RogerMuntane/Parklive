<?php

/**
 * Class DatabaseConnection
 * 
 * Gestiona la connexió a la base de dades MySQL utilitzant variables d'entorn.
 */
class DatabaseConnection
{
    /** @var array|null Caché de les variables d'entorn carregades des del fitxer .env */
    private static ?array $envCache = null;

    /**
     * Crea i retorna una nova connexió mysqli.
     * 
     * @return mysqli Objecte de connexió a la base de dades.
     * @throws Exception Si hi ha un error en la connexió.
     */
    public static function create(): mysqli
    {
        $config = self::getConfig();
        $connection = new mysqli($config['host'], $config['user'], $config['password'], $config['db']);

        if ($connection->connect_error) {
            throw new Exception('Error de connexio: ' . $connection->connect_error);
        }

        $connection->set_charset('utf8mb4');
        $connection->query("SET collation_connection = utf8mb4_0900_ai_ci");
        return $connection;
    }

    /**
     * Obté la configuració de la base de dades des de les variables d'entorn.
     * 
     * @return array Configuració amb host, db, user i password.
     * @throws Exception Si falten variables d'entorn obligatòries.
     */
    private static function getConfig(): array
    {
        $env = self::loadEnv();

        $host = self::envValue(['DB_HOST', 'MYSQL_HOST'], $env, 'localhost');
        $db = self::envValue(['DB_NAME', 'MYSQL_DATABASE'], $env);
        $user = self::envValue(['DB_USER', 'MYSQL_USER'], $env);
        $password = self::envValue(['DB_PASSWORD', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD'], $env, '');

        if (!$db || !$user) {
            throw new Exception("Falten variables d'entorn per a la base de dades");
        }

        return [
            'host' => $host,
            'db' => $db,
            'user' => $user,
            'password' => $password
        ];
    }

    /**
     * Recupera el valor d'una variable d'entorn provant diverses claus.
     * 
     * @param array $keys Llista de claus a provar.
     * @param array $env Array amb les variables carregades des del fitxer .env.
     * @param string|null $default Valor per defecte si no es troba cap clau.
     * @return string|null Valor de la variable d'entorn o null.
     */
    private static function envValue(array $keys, array $env, ?string $default = null): ?string
    {
        foreach ($keys as $key) {
            $value = getenv($key);
            if ($value !== false && $value !== '') {
                return $value;
            }

            if (array_key_exists($key, $env) && $env[$key] !== '') {
                return $env[$key];
            }
        }

        return $default;
    }

    /**
     * Carrega les variables d'entorn des del fitxer .env situat a l'arrel del projecte.
     * 
     * @return array Array associatiu amb les variables d'entorn.
     */
    private static function loadEnv(): array
    {
        if (self::$envCache !== null) {
            return self::$envCache;
        }

        $envPath = dirname(__DIR__, 3) . '/.env';
        self::$envCache = is_readable($envPath) ? (parse_ini_file($envPath) ?: []) : [];

        return self::$envCache;
    }
}

