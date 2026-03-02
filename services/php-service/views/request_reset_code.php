<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$errors = isset($_SESSION['errors']) ? $_SESSION['errors'] : array();
unset($_SESSION['errors']);
?>
<!DOCTYPE html>
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sol·licitar canvi de contrasenya - Parklive</title>
    <link rel="stylesheet" href="signin.css">
    <style>
        .info-message {
            background-color: #d1ecf1;
            color: #0c5460;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #bee5eb;
        }

        .info-message p {
            margin: 0;
            font-size: 14px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1> Recuperar contrasenya</h1>

        <div class="info-message">
            <p>Introdueix el teu email i t'enviarem un codi de verificació per canviar la teva contrasenya.</p>
        </div>

        <?php if (!empty($errors)): ?>
            <div class="error-message">
                <strong>Error:</strong>
                <ul class="error-list">
                    <?php foreach ($errors as $error): ?>
                        <li><?php echo htmlspecialchars($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form action="../controllers/request_reset_code.php" method="POST">
            <div class="form-group">
                <label for="email">Email registrat:</label>
                <input type="email" id="email" name="email" placeholder="exemple@parklive.cat" required autofocus>
            </div>

            <button type="submit">Enviar codi de verificació</button>
        </form>

        <p class="helper-text" style="text-align: center; margin-top: 20px;">
            Recordes la contrasenya? <a href="login.php">Inicia sessió aquí</a>
        </p>
    </div>
</body>

</html>