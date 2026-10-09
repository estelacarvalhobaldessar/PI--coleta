<?php
// CONEXAO VIA PDO, com os dados do banco do .env da raiz do projeto
require_once __DIR__ . '/../env.php';

$env = ecoleta_env();
$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $env['DB_HOST'] ?? 'localhost',
    $env['DB_PORT'] ?? '3306',
    $env['DB_NAME'] ?? 'ecoleta'
);

try {
    $conexao = new PDO($dsn, $env['DB_USER'] ?? 'root', $env['DB_PASSWORD'] ?? '');
    $conexao->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log("website: erro na conexão com o banco: " . $e->getMessage());
    die("Não foi possível conectar ao banco de dados.");
}
