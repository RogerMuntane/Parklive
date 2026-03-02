<?php

class DatabaseConnection
{
    private static ?array $envCache = null;

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
