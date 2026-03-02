<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$errors = isset($_SESSION['errors']) ? $_SESSION['errors'] : array();
$successMessage = isset($_SESSION['success_message']) ? $_SESSION['success_message'] : null;
$resetData = isset($_SESSION['password_reset']) ? $_SESSION['password_reset'] : null;

unset($_SESSION['errors'], $_SESSION['success_message']);

if (!$resetData) {
    header('Location: request_reset_code.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificar codi - Parklive</title>
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

        .code-input {
            text-align: center;
            letter-spacing: 5px;
            font-size: 18px;
            font-weight: bold;
            font-family: monospace;
        }

        .timer {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin-top: 10px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>✉️ Verificar codi</h1>

        <div class="info-message">
            <p>T'hem enviat un codi de 6 caràcters a <strong><?php echo htmlspecialchars($resetData['email']); ?></strong></p>
            <p style="margin-top: 8px; font-size: 13px;">Verifica'l aquí per continuar amb el canvi de contrasenya.</p>
        </div>

        <?php if ($successMessage): ?>
            <div class="success-message">
                <?php echo htmlspecialchars($successMessage); ?>
            </div>
        <?php endif; ?>

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

        <form action="../controllers/verify_reset_code.php" method="POST">
            <div class="form-group">
                <label for="verification_code">Codi de verificació:</label>
                <input type="text" id="verification_code" name="verification_code" class="code-input" placeholder="ABC123" maxlength="6" required autofocus>
                <div class="timer">El codi és vàlid durant <strong>30 minuts</strong></div>
            </div>

            <button type="submit">Verificar codi</button>
        </form>

        <p class="helper-text" style="text-align: center; margin-top: 20px;">
            No has rebut el codi? <a href="request_reset_code.php">Sol·licita un de nou</a>
        </p>
    </div>
</body>

</html>