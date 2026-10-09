<?php

// Funções comuns aos endpoints: resposta JSON e verificação do token interno.

function responderJson(int $status, array $dados): never
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Só o servidor Express (app) chama esta API. Ele envia o token no cabeçalho
// X-Api-Token; qualquer outra chamada, inclusive direto pelo navegador, é recusada.
function exigirTokenInterno(): void
{
    $arquivo = __DIR__ . "/../config.php";

    if (!is_file($arquivo)) {
        error_log("api: config.php não encontrado. Copie config.exemplo.php para config.php.");
        responderJson(500, [
            "sucesso" => false,
            "mensagem" => "API não configurada."
        ]);
    }

    $config = require $arquivo;
    $esperado = (string) ($config["token_interno"] ?? "");
    $recebido = (string) ($_SERVER["HTTP_X_API_TOKEN"] ?? "");

    if ($esperado === "" || $esperado === "troque-este-valor" || !hash_equals($esperado, $recebido)) {
        responderJson(403, [
            "sucesso" => false,
            "mensagem" => "Acesso não autorizado."
        ]);
    }
}
