<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$errors = isset($_SESSION['errors']) ? $_SESSION['errors'] : array();
$successMessage = isset($_SESSION['success_message']) ? $_SESSION['success_message'] : null;
$resetData = isset($_SESSION['password_reset']) ? $_SESSION['password_reset'] : null;

// Verificar que el codi ha estat validat
if (!$resetData || !$resetData['verified']) {
    header('Location: request_reset_code.php');
    exit();
}

$email = $resetData['email'] ?? '';
unset($_SESSION['errors'], $_SESSION['success_message']);
?>
<!DOCTYPE html>
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canviar contrasenya - Parklive</title>
    <link rel="stylesheet" href="signin.css">
    <style>
        .info-message {
            background-color: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
        }

        .info-message p {
            margin: 0;
            font-size: 14px;
        }

        .password-strength {
            margin-top: 8px;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            display: none;
        }

        .password-strength.weak {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            display: block;
        }

        .password-strength.medium {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            display: block;
        }

        .password-strength.strong {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            display: block;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1> Canviar contrasenya</h1>

        <div class="info-message">
            <p>Codi verificat per <strong><?php echo htmlspecialchars($email); ?></strong></p>
            <p style="margin-top: 8px; font-size: 13px;">Introdueix una nova contrasenya forta per protegir el teu compte.</p>
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

        <form action="../controllers/canvi_contassenya.php" method="POST" id="passwordForm">
            <input type="hidden" name="email" value="<?php echo htmlspecialchars($email); ?>">

            <div class="form-group">
                <label for="contrasenya_nova">Nova contrasenya:</label>
                <input type="password" id="contrasenya_nova" name="contrasenya_nova" required minlength="8" placeholder="Mínim 8 caràcters">
                <div class="password-strength" id="passwordStrength"></div>
            </div>

            <div class="form-group">
                <label for="contrasenya_confirmar">Confirmar nova contrasenya:</label>
                <input type="password" id="contrasenya_confirmar" name="contrasenya_confirmar" required minlength="8" placeholder="Repeteix la contrasenya">
            </div>

            <button type="submit">Canviar contrasenya</button>
        </form>

        <p class="helper-text" style="text-align: center; margin-top: 20px;">
            <a href="login.php">Tornar a l'inici de sessió</a>
        </p>
    </div>

    <script>
        document.getElementById('contrasenya_nova').addEventListener('input', function() {
            const password = this.value;
            const strengthDiv = document.getElementById('passwordStrength');
            const email = document.querySelector('input[name="email"]').value;

            if (password.length === 0) {
                strengthDiv.className = 'password-strength';
                return;
            }

            let strength = 0;
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^a-zA-Z0-9]/.test(password)) strength++;
            if (password !== email && password.indexOf(email.split('@')[0]) === -1) strength++;

            strengthDiv.className = 'password-strength';
            if (strength < 2) {
                strengthDiv.className += ' weak';
                strengthDiv.textContent = ' Contrasenya feble - Afegeix lletres majúscules, números o símbols';
            } else if (strength < 4) {
                strengthDiv.className += ' medium';
                strengthDiv.textContent = ' Contrasenya mitjana - Considera afegir més varietat';
            } else {
                strengthDiv.className += ' strong';
                strengthDiv.textContent = ' Contrasenya forta';
            }
        });

        document.getElementById('passwordForm').addEventListener('submit', function(e) {
            const pwd1 = document.getElementById('contrasenya_nova').value;
            const pwd2 = document.getElementById('contrasenya_confirmar').value;

            if (pwd1 !== pwd2) {
                e.preventDefault();
                alert('Les contrassenyes no coincideixen.');
                return false;
            }

            if (pwd1.length < 8) {
                e.preventDefault();
                alert('La contrasenya ha de tenir almenys 8 caràcters.');
                return false;
            }
        });
    </script>
</body>

</html>