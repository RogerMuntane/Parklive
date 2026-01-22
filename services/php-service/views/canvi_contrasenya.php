<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar que l'usuari està autenticat
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
    // header('Location: login.php');
    exit();
}

$errors = isset($_SESSION['errors']) ? $_SESSION['errors'] : array();
$successMessage = isset($_SESSION['success_message']) ? $_SESSION['success_message'] : null;

unset($_SESSION['errors'], $_SESSION['success_message']);
?>
<!DOCTYPE html>
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canviar contrasenya - Parklive</title>
    <link rel="stylesheet" href="signin.css">
</head>

<body>
    <div class="container">
        <h1>Canviar contrasenya</h1>

        <?php if (!empty($errors)): ?>
            <div class="error-message">
                <strong>Errors en la validació:</strong>
                <ul class="error-list">
                    <?php foreach ($errors as $error): ?>
                        <li><?php echo htmlspecialchars($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form action="../controllers/canvi_contassenya.php" method="POST">
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($_SESSION['user']['email'] ?? ''); ?>" required readonly>
            </div>

            <div class="form-group">
                <label for="contrasenya_actual">Contrasenya actual:</label>
                <input type="password" id="contrasenya_actual" name="contrasenya_actual" required>
            </div>

            <div class="form-group">
                <label for="contrasenya_nova">Nova contrasenya:</label>
                <input type="password" id="contrasenya_nova" name="contrasenya_nova" required>
            </div>

            <div class="form-group">
                <label for="contrasenya_confirmar">Confirmar nova contrasenya:</label>
                <input type="password" id="contrasenya_confirmar" name="contrasenya_confirmar" required>
            </div>

            <button type="submit">Canviar contrasenya</button>
        </form>

        <p class="helper-text"><a href="login.php">Tornar a l'inici de sessió</a></p>
    </div>
</body>

</html>