<?php
session_start();

require_once '../models/validarUsuari.php';
require_once '../models/ResetPasswordModel.php';

$errors = array();
$email = isset($_POST['email']) ? trim($_POST['email']) : '';

// Validar email
$validador = new validarUsuari();
if (!$validador->validarEmail($email)) {
    $errors = array_merge($errors, $validador->getErrors());
}
$validador->clearErrors();

// Comprovar que l'usuari existeix
if (empty($errors)) {
    $model = new ResetPasswordModel();
    $userId = $model->getUserIdByEmail($email);
    if (!$userId) {
        $errors[] = "No s'ha trobat cap usuari amb aquest email";
    }
    $errors = array_merge($errors, $model->getErrors());
}

// Si hi ha errors, redirigir a la vista amb els errors
if (!empty($errors)) {
    $_SESSION['errors'] = $errors;
    header('Location: ../views/request_reset_code.php');
    exit();
}

// Enviar el codi via API Python
$pythonBase = getenv('PYTHON_SERVICE_URL') ?: 'http://python-service:5000';
$url = rtrim($pythonBase, '/') . '/api/auth/send-reset-code';
$payload = json_encode(['email' => $email]);

$responseBody = null;
$httpCode = null;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $responseBody = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        $errors[] = 'Error en comunicar amb el servei de verificació: ' . curl_error($ch);
    }
    curl_close($ch);
}
//Per se falla el curl es pot fer una petició post(No es necesari, ja que funciona correctament)
else {
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 10,
        ],
    ]);
    $responseBody = @file_get_contents($url, false, $context);
    if (isset($http_response_header)) {
        foreach ($http_response_header as $headerLine) {
            if (stripos($headerLine, 'HTTP/') === 0) {
                $parts = explode(' ', $headerLine);
                $httpCode = isset($parts[1]) ? (int)$parts[1] : null;
                break;
            }
        }
    }
    if ($responseBody === false) {
        $errors[] = 'Error en comunicar amb el servei de verificació.';
    }
}

// Gestionar resposta de Python API
if (!empty($errors) || !$responseBody || $httpCode !== 200) {
    $data = json_decode($responseBody, true) ?? [];
    $errorMsg = $data['error'] ?? "No s'ha pogut enviar el codi. Torna-ho a provar.";

    // Debug: Mostrar el codi HTTP i la resposta completa
    $debugInfo = " [HTTP: $httpCode]";
    if (!empty($data)) {
        $debugInfo .= " [Resposta: " . json_encode($data) . "]";
    }

    $errors[] = $errorMsg . $debugInfo;
    $_SESSION['errors'] = $errors;
    header('Location: ../views/request_reset_code.php');
    exit();
}

// Emmagatzemar dades de reset a la sessió
$data = json_decode($responseBody, true);
$_SESSION['password_reset'] = [
    'email' => $email,
    'user_id' => $userId,
    'verification_id' => $data['verification_id'] ?? null,
    'expires_at' => $data['expires_at'] ?? null,
    'verified' => false,
];

// Redirigir a la vista de verificació de codi
header('Location: ../views/mail.php');
