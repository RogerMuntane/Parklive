-- 1. CONFIGURACIÓ DEL SISTEMA
INSERT INTO configuracio_sistema (clau, valor, tipus, descripcio)
VALUES (
        'app_name',
        'Parklive',
        'string',
        'Nom de l''aplicació'
    ),
    (
        'app_version',
        '2.4.1',
        'string',
        'Versió actual de l''aplicació'
    ),
    (
        'maintenance_mode',
        'false',
        'boolean',
        'Mode de manteniment activat'
    ),
    (
        'max_reserves_per_user',
        '10',
        'number',
        'Nombre màxim de reserves actives per usuari'
    ),
    (
        'cancel_hours_before',
        '2',
        'number',
        'Hores mínimes abans de l''entrada per cancel·lar sense penalització'
    ),
    (
        'punts_per_reserva',
        '10',
        'number',
        'Punts de gamificació per reserva completada'
    ),
    (
        'punts_per_valoracio',
        '5',
        'number',
        'Punts de gamificació per valoració deixada'
    ),
    (
        'punts_per_contribucio',
        '10',
        'number',
        'Punts base per contribució validada'
    ),
    (
        'iva_percentatge',
        '21',
        'number',
        'Percentatge d''IVA aplicable'
    ),
    (
        'descompte_premium',
        '10',
        'number',
        'Percentatge de descompte per a usuaris Premium'
    ),
    (
        'email_suport',
        'suport@parklive.cat',
        'string',
        'Correu electrònic de suport'
    ),
    (
        'telefon_suport',
        '+34 932 000 000',
        'string',
        'Telèfon d''atenció al client'
    ),
    (
        'max_foto_size_mb',
        '5',
        'number',
        'Mida màxima de fitxer de foto en MB'
    ),
    (
        'session_timeout_minutes',
        '120',
        'number',
        'Temps d''expiració de sessió en minuts'
    ),
    (
        'enable_gamification',
        'true',
        'boolean',
        'Sistema de gamificació activat'
    ),
    (
        'enable_notifications_push',
        'true',
        'boolean',
        'Notificacions push activades'
    ),
    (
        'google_maps_api_key',
        'AIzaSyXXXXXXXXXXXXXXXXXXXXXX',
        'string',
        'Clau API de Google Maps'
    ),
    (
        'stripe_public_key',
        'pk_test_XXXXXXXXXXXXXXXX',
        'string',
        'Clau pública de Stripe per pagaments'
    ),
    (
        'featured_parkings',
        '[1, 3, 5]',
        'json',
        'IDs dels aparcaments destacats a la pàgina principal'
    ),
    (
        'working_hours',
        '{"start": "06:00", "end": "22:00"}',
        'json',
        'Horari d''atenció al client'
    );
