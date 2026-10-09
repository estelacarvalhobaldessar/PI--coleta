<?php

class Database
{
    public function conectar(): PDO
    {
        $config = require __DIR__ . '/../config.php';

        try {
            $pdo = new PDO(
                "mysql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']};charset=utf8mb4",
                $config['db_user'],
                $config['db_password']
            );

            $pdo->setAttribute(
                PDO::ATTR_ERRMODE,
                PDO::ERRMODE_EXCEPTION
            );

            $pdo->setAttribute(
                PDO::ATTR_DEFAULT_FETCH_MODE,
                PDO::FETCH_ASSOC
            );

            return $pdo;

        } catch (PDOException $e) {

            // Quem chama responde em JSON; o detalhe fica só no log.
            error_log("Erro na conexão com o banco ({$config['db_host']}:{$config['db_port']}/{$config['db_name']}): " . $e->getMessage());
            throw new RuntimeException("Erro na conexão com o banco.");
        }
    }
}
