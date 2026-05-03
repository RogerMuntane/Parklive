<?php

class Logout
{
    public function processLogout()
    {
        // Retornar resposta JSON d'èxit
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Sessió tancada correctament']);
        exit();
    }
}
