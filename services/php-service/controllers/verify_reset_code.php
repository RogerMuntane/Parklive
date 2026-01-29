<?php
session_start();

$errors = array();
$code = isset($_POST['verification_code']) ? trim($_POST['verification_code']) : '';
$resetData = isset($_SESSION['password_reset']) ? $_SESSION['password_reset'] : null;

if (!$resetData) {
    $errors[] = 'No hi ha cap sol·licitud de canvi de contrasenya activa.';
}

if (empty($code)) {
    $errors[] = 'El codi de verificació és obligatori.';
}

if ($resetData) {
    $expiresAt = isset($resetData['expires_at']) ? strtotime($resetData['expires_at']) : null;
    if ($expiresAt && time() > $expiresAt) {
        $errors[] = "El codi ha caducat. Demana'n un de nou.";
    }

    $expectedHash = $resetData['code_hash'] ?? null;
    if (!$expectedHash) {
        $errors[] = 'No s\'ha pogut validar el codi.';
    }
}

if (empty($errors) && isset($expectedHash)) {
    $codeHash = hash('sha256', $code);
    if (!hash_equals($expectedHash, $codeHash)) {
        $errors[] = 'El codi introduït no és correcte.';
    } else {
        $_SESSION['password_reset']['verified'] = true;
        $_SESSION['success_message'] = 'Codi verificat. Introdueix la nova contrasenya.';
        header('Location: ../views/canvi_contrasenya.php');
        exit();
    }
}

$_SESSION['errors'] = $errors;
header('Location: ../views/mail.php');
exit();
