<?php
error_reporting(-1);
ini_set('display_errors', 'On');

require_once "../controllers/signin.php";

$controller = new Signin();
?>
<!DOCTYPE html>
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registre - Parklive</title>
    <link rel="stylesheet" href="signin.css">
</head>

<body>
    <div class="container">
        <h1>Registre d'Usuari</h1>

        <?php if (isset($_GET['success']) && $_GET['success'] === 'true'): ?>
            <div class="success-message">
                Usuari registrat correctament!
            </div>
        <?php endif; ?>

        <?php if (isset($_SESSION['errors']) && !empty($_SESSION['errors'])): ?>
            <div class="error-message">
                <strong>Errors en la validació:</strong>
                <ul class="error-list">
                    <?php foreach ($_SESSION['errors'] as $error): ?>
                        <li><?php echo htmlspecialchars($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <?php unset($_SESSION['errors']); ?>
        <?php endif; ?>

        <form action="../controllers/signin.php" method="POST">
            <div class="form-group">
                <label for="name">Nom:</label>
                <input type="text" id="name" name="name" required>
            </div>

            <div class="form-group">
                <label for="cognom">Cognom:</label>
                <input type="text" id="cognom" name="cognom" required>
            </div>

            <div class="form-group">
                <label for="mail">Email:</label>
                <input type="email" id="mail" name="mail" required>
            </div>

            <div class="form-group">
                <label for="contrasenya">Contrasenya:</label>
                <input type="password" id="contrasenya" name="contrasenya" required>
            </div>

            <div class="form-group">
                <label for="contrasenya_confirmar">Confirmar Contrasenya:</label>
                <input type="password" id="contrasenya_confirmar" name="contrasenya_confirmar" required>
            </div>

            <div class="form-group">
                <label for="telefon">Telèfon:</label>
                <input type="tel" id="telefon" name="telefon" required>
            </div>

            <button type="submit">Registrar-se</button>
        </form>
    </div>
</body>

</html>