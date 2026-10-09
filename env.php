<?php

// Lê o .env da raiz do projeto, o mesmo arquivo usado pelo app (Node), pela api e pelo website.
// Variáveis de ambiente do sistema, quando definidas, têm prioridade sobre o arquivo.
function ecoleta_env(): array
{
    static $env = null;
    if ($env !== null) {
        return $env;
    }

    $env = [];
    $arquivo = __DIR__ . '/.env';
    $linhas = is_file($arquivo) ? file($arquivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];

    foreach ($linhas as $linha) {
        $linha = trim($linha);
        if ($linha === '' || $linha[0] === '#' || !str_contains($linha, '=')) {
            continue;
        }
        [$chave, $valor] = array_map('trim', explode('=', $linha, 2));
        if (strlen($valor) >= 2 && ($valor[0] === '"' || $valor[0] === "'") && $valor[-1] === $valor[0]) {
            $valor = substr($valor, 1, -1);
        }
        $env[$chave] = $valor;
    }

    foreach (array_keys($env) as $chave) {
        $doSistema = getenv($chave);
        if ($doSistema !== false && $doSistema !== '') {
            $env[$chave] = $doSistema;
        }
    }

    return $env;
}
