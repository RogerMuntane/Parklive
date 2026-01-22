<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
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
    <title>Inici sessió - Parklive</title>
    <link rel="stylesheet" href="signin.css">
</head>

<body>
    <div class="container">
        <h1>Iniciar sessió</h1>

        <?php if (!empty($successMessage)): ?>
            <div class="success-message">
                <?php echo htmlspecialchars($successMessage); ?>
            </div>
        <?php endif; ?>

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

        <form action="../controllers/login.php" method="POST">

            <div class="form-group">
                <label for="mail">Email:</label>
                <input type="email" id="mail" name="mail" required>
            </div>

            <div class="form-group">
                <label for="contrasenya">Contrasenya:</label>
                <input type="password" id="contrasenya" name="contrasenya" required>
            </div>

            <button type="submit">Iniciar sessió</button>
        </form>

        <p class="helper-text">No tens compte? <a href="signin.php">Registra't</a></p>
        <p class="helper-text"><a href="canvi_contrasenya.php">He oblidat la contrasenya</a></p>
    </div>
</body>

</html>