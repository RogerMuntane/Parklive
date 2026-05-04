-- 1. ARTICLES DEL BLOG
INSERT INTO articles_blog (
        titol,
        slug,
        contingut,
        resum,
        autor_id,
        categoria,
        imatge_destacada,
        publicat,
        data_publicacio,
        visites
    )
VALUES (
        'Com estalviar temps cercant aparcament a Barcelona',
        'estalviar-temps-aparcament-barcelona',
        'Barcelona és una ciutat vibrant però trobar aparcament pot ser un repte diari. En aquest article et donem consells pràctics per optimitzar la teva cerca i estalviar temps valuós...',
        'Descobreix estratègies efectives per trobar aparcament ràpidament al centre de Barcelona',
        3,
        'consells',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
        TRUE,
        '2026-02-10 10:00:00',
        342
    ),
    (
        'L''impacte de la mobilitat elèctrica als aparcaments urbans',
        'mobilitat-electrica-aparcaments-urbans',
        'L''augment de vehicles elèctrics està transformant els aparcaments urbans. Els punts de càrrega ja no són un luxe sinó una necessitat. Analitzem la situació actual a Catalunya...',
        'Com la mobilitat elèctrica està canviant els aparcaments a les ciutats catalanes',
        3,
        'sostenibilitat',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
        TRUE,
        '2026-02-05 09:30:00',
        287
    ),
    (
        'Novetats de Parklive: Reserva amb un clic',
        'novetats-parklive-reserva-rapida',
        'Estem emocionats d''anunciar la nova funcionalitat de reserva ràpida que permet als usuaris reservar una plaça en menys de 30 segons. Descobreix com funciona...',
        'Presentem la nova funcionalitat de reserva express de Parklive',
        3,
        'novetats',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
        TRUE,
        '2026-02-18 11:00:00',
        521
    ),
    (
        '5 errors comuns en reservar aparcament online',
        '5-errors-comuns-reserva-aparcament',
        'Evita aquestes trampes habituals quan reserves aparcament per Internet: des de no llegir la lletra petita fins a oblidar confirmar l''horari...',
        'Guia per evitar els errors més freqüents en les reserves d''aparcament',
        3,
        'consells',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
        TRUE,
        '2026-01-28 14:00:00',
        198
    ),
    (
        'El futur dels aparcaments intel·ligents',
        'futur-aparcaments-intelligents',
        'Sensors IoT, IA predictiva, gestió automatitzada... El futur dels aparcaments urbans és digital. Explorem les tendències tecnològiques que revolucionaran el sector...',
        'Tecnologies emergents que transformaran els aparcaments en els propers anys',
        3,
        'mobilitat',
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
        FALSE,
        NULL,
        0
    );

-- 2. FAQS (Preguntes Freqüents)
INSERT INTO faqs (
        pregunta,
        resposta,
        categoria,
        ordre,
        activa,
        visites
    )
VALUES (
        'Com puc reservar una plaça d''aparcament?',
        'Per reservar una plaça, inicia sessió al teu compte, busca l''aparcament desitjat pel mapa o cercador, selecciona l''horari d''entrada i sortida, i completa el pagament. Rebràs un codi de reserva per correu electrònic.',
        'Reserves',
        1,
        TRUE,
        856
    ),
    (
        'Puc cancel·lar la meva reserva?',
        'Sí, pots cancel·lar la teva reserva fins a 2 hores abans de l''hora d''entrada prevista. La cancel·lació es fa des del teu panell d''usuari. El reemborsament es processa en un termini de 3-5 dies laborables.',
        'Reserves',
        2,
        TRUE,
        623
    ),
    (
        'Quins mètodes de pagament accepteu?',
        'Acceptem targetes de crèdit i dèbit (Visa, Mastercard, American Express), PayPal, Apple Pay i Google Pay. Tots els pagaments es processen de forma segura amb encriptació SSL.',
        'Pagaments',
        3,
        TRUE,
        541
    ),
    (
        'Què és la subscripció Premium?',
        'La subscripció Premium ofereix descomptes exclusius en reserves, accés prioritari a places, sense comissions de cancel·lació, i punts de gamificació x2. Disponible en plans mensual, trimestral i anual.',
        'Compte',
        4,
        TRUE,
        412
    ),
    (
        'Com funciona el sistema de punts?',
        'Guanyes punts per cada reserva completada, valoració deixada i disponibilitat reportada a la comunitat. Els punts desbloquegen recompenses com descomptes, insignies i períodes Premium gratuïts.',
        'Gamificació',
        5,
        TRUE,
        387
    ),
    (
        'Què faig si no trobo el meu vehicle a la sortida?',
        'Contacta immediatament amb el telèfon d''atenció de l''aparcament (apareix a la teva reserva) i també amb el nostre equip de suport des de l''app. Gestionarem la incidència amb màxima prioritat.',
        'Incidències',
        6,
        TRUE,
        156
    ),
    (
        'Els aparcaments són segurs?',
        'Tots els aparcaments de la nostra xarxa compleixen amb normatives de seguretat, i la majoria disposen de videovigilància 24h, il·luminació adequada i personal de seguretat.',
        'Seguretat',
        7,
        TRUE,
        289
    ),
    (
        'Puc aparcar vehicles elèctrics?',
        'Molts dels nostres aparcaments ofereixen punts de càrrega per a vehicles elèctrics. Pots filtrar per aquesta característica al cercador. El cost de càrrega està detallat a cada aparcament.',
        'Serveis',
        8,
        TRUE,
        334
    ),
    (
        'Com puc contribuir amb informació sobre disponibilitat?',
        'Des de la nostra web, pots reportar l''estat de disponibilitat dels aparcaments en temps real. Les contribucions validades et donen punts de gamificació.',
        'Col·laboració',
        9,
        TRUE,
        178
    );

-- 3. NOTIFICACIONS
INSERT INTO notificacions (
        usuari_id,
        tipus,
        titol,
        missatge,
        llegida,
        url_accio,
        data_llegida
    )
VALUES (5, 'confirmacio', 'Reserva confirmada', 'La teva reserva RES-2026-000001 per al Parking Plaça Catalunya ha estat confirmada. T''esperem el 15/02/2026 a les 10:00h.', TRUE, '/reserves/1', '2026-02-15 09:57:00'),
    (5, 'info', 'Nou article al blog', 'Hem publicat un nou article: "Com estalviar temps cercant aparcament a Barcelona". Llegeix-lo ara!', FALSE, '/blog/estalviar-temps-aparcament-barcelona', NULL),
    (6, 'confirmacio', 'Reserva confirmada', 'Reserva RES-2026-000002 confirmada correctament. Aparcament Les Corts t''espera el 18/02/2026.', TRUE, '/reserves/2', '2026-02-18 08:22:00'),
    (6, 'promocio', 'Descompte exclusiu: 15% OFF', 'Com a usuari Premium, tens un 15% de descompte en la teva propera reserva. Codi: PREMIUM15. Vàlid fins al 28/02/2026.', FALSE, '/promocions', NULL),
    (7, 'confirmacio', 'Reserva finalitzada', 'Gràcies per usar Parklive! La teva reserva RES-2026-000003 s''ha finalitzat. Valora la teva experiència i guanya punts.', TRUE, '/valoracions/nova?aparcament=3', '2026-02-20 20:15:00'),
    (8, 'confirmacio', 'Pagament processat', 'El pagament de 20,00€ per la reserva RES-2026-000004 s''ha completat amb èxit.', TRUE, '/pagaments/4', '2026-02-23 14:32:00'),
    (8, 'alerta', 'Reserva demà', 'Recordatori: Tens una reserva demà 25/02 a les 9:00h al Parking Plaça Catalunya. Codi: RES-2026-000004.', FALSE, '/reserves/4', NULL),
    (9, 'confirmacio', 'Has guanyat una recompensa!', 'Felicitats! Has desbloquejat la insignia "Col·laborador Actiu" per les teves contribucions. +20 punts!', TRUE, '/recompenses', '2026-01-18 17:12:00'),
    (11, 'info', 'Reserva en curs', 'La teva reserva RES-2026-000007 està en curs. Recorda que finalitza avui a les 23:59h.', FALSE, '/reserves/7', NULL),
    (12, 'sistema', 'Renovació Premium', 'La teva subscripció Premium Anual es renovarà automàticament el 10/06/2026. Preu: 59,99€.', FALSE, '/subscripcions', NULL),
    (13, 'confirmacio', 'Reemborsament processat', 'El reemborsament de 8,00€ de la reserva cancel·lada RES-2026-000009 s''ha processat. Rebràs els diners en 3-5 dies.', TRUE, '/pagaments/9', '2026-02-22 16:00:00');

-- 4. MISSATGES DE SUPORT
INSERT INTO missatges_suport (
        usuari_id,
        nom,
        email,
        assumpte,
        missatge,
        categoria,
        estat,
        prioritat
    )
VALUES (8, 'Marc Solà', 'marc.sola@email.com', 'Problema amb el lector de matrícules', 'Avui al matí (23/02) he tingut problemes per entrar al Parking Diagonal amb el meu codi de reserva. El lector no reconeixia la matrícula i he hagut d''esperar 10 minuts fins que algú m''ha obert manualment.', 'tecnic', 'en_proces', 'alta'),
    (NULL, 'Laura Vidal', 'laura.vidal@email.com', 'Consulta sobre subscripció Premium', 'Voldria saber si amb la subscripció Premium puc cancel·lar reserves sense penalització i quins descomptes ofereix exactament. Gràcies!', 'general', 'resolt', 'baixa'),
    (13, 'Jordi Martínez', 'jordi.martinez@email.com', 'Sol·licitud de factura duplicada', 'Necessito una còpia de la factura FACT-2026-000009 per a la meva empresa. Podeu reenviar-la al meu correu? Gràcies.', 'pagament', 'resolt', 'mitjana'),
    (10, 'Anna Puig', 'anna.puig@email.com', 'No puc modificar el meu perfil', 'Intento canviar el meu número de telèfon al perfil però em surt un error "503 Service Unavailable". Ho he provat diverses vegades.', 'compte', 'pendent', 'mitjana'),
    (NULL, 'Carles Font', 'carles.font@email.com', 'Suggeriment: afegir més aparcaments a Girona', 'Sóc usuari habitual a Barcelona però vivint a Girona. Seria genial tener més opcions d''aparcament a la ciutat. Hi ha plans d''expansió?', 'altres', 'pendent', 'baixa'),
    (14, 'Marta Roca', 'marta.roca@email.com', 'Cancel·lació de subscripció', 'Vull cancel·lar la meva subscripció mensual. Com puc fer-ho des de l''app? No trobo l''opció al menú.', 'compte', 'resolt', 'mitjana');
