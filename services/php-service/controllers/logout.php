<?php

/**
 * Class Logout
 * 
 * Controlador per gestionar el tancament de sessió.
 */
class Logout
{
    /**
     * Processa el tancament de sessió retornant una resposta JSON d'èxit.
     * Atès que s'utilitza JWT, el tancament de sessió es gestiona principalment al client.
     * 
     * @return void
     */
    public function processLogout()
    {
        // Retornar resposta JSON d'èxit
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Sessió tancada correctament']);
        exit();
    }
}

