<?php

// Configuração da API, lida do .env da raiz do projeto (veja ../.env.example).
require_once __DIR__ . '/../env.php';

$env = ecoleta_env();

return [
    'db_host' => $env['DB_HOST'] ?? 'localhost',
    'db_port' => $env['DB_PORT'] ?? '3306',
    'db_name' => $env['DB_NAME'] ?? 'ecoleta',
    'db_user' => $env['DB_USER'] ?? 'root',
    'db_password' => $env['DB_PASSWORD'] ?? '',
    // Mesmo valor que o app envia no cabeçalho X-Api-Token.
    'token_interno' => $env['INTERNAL_API_TOKEN'] ?? '',
];
