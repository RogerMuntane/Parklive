<?php

/**
 * Exemple de pàgina protegida que requereix autenticació
 */

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Protegir aquesta pàgina - només usuaris autenticats poden accedir
AuthMiddleware::verificarAutenticacio();

// Obtenir dades de l'usuari autenticat
$usuari = AuthMiddleware::obtenirUsuariAutenticat();
?>

<!DOCTYPE html>
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pàgina Protegida - Parklive</title>
</head>

<body>
    <h1>Benvingut, <?php echo htmlspecialchars($usuari['nom']); ?>!</h1>

    <div>
        <h2>Informació del teu compte:</h2>
        <ul>
            <li><strong>ID:</strong> <?php echo htmlspecialchars($usuari['id']); ?></li>
            <li><strong>Nom:</strong> <?php echo htmlspecialchars($usuari['nom']); ?></li>
            <li><strong>Cognom:</strong> <?php echo htmlspecialchars($usuari['cognom']); ?></li>
            <li><strong>Email:</strong> <?php echo htmlspecialchars($usuari['email']); ?></li>
        </ul>
    </div>

    <div>
        <a href="../controllers/logout.php">Tancar Sessió</a>
    </div>

    <?php
    // Exemple d'ús de missatges flash
    if (SessionModel::teFlashMessages()) {
        $missatges = SessionModel::getAllFlashMessages();
        foreach ($missatges as $tipus => $missatge) {
            echo "<div class='alert alert-{$tipus}'>" . htmlspecialchars($missatge) . "</div>";
        }
    }
    ?>
</body>

</html>