<?php

ini_set("display_errors", "0");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/classes/Api.php";

// Chamado pelo servidor Express com o id do usuário logado: dados_usuario.php?id=123
exigirTokenInterno();

require_once __DIR__ . "/classes/Database.php";
require_once __DIR__ . "/classes/Usuarios.php";

// Endereço atual do caminhão de coleta (origem da rota). Ao salvar este arquivo,
// o mapa de quem estiver logado é atualizado automaticamente.
const CAMINHAO = [
    "cep" => "90250-180",
    "logradouro" => "Av. Cristovão Colombo, 595",
    "bairro" => "Floresta",
    "cidade" => "Porto Alegre",
    "uf" => "RS"
];

function tragaDadosUsuario(Usuario $usuarios, int $id): array
{
    try {
        $usuario = $usuarios->BuscarEndereco($id);
    } catch (RuntimeException $e) {
        // ViaCEP fora do ar e endereço ainda não gravado
        error_log("dados_usuario.php: " . $e->getMessage());
        responderJson(503, [
            "sucesso" => false,
            "mensagem" => "Não foi possível obter o seu endereço agora. Tente novamente em instantes."
        ]);
    }

    if ($usuario === null) {
        responderJson(404, [
            "sucesso" => false,
            "mensagem" => "Usuário não encontrado."
        ]);
    }

    if (empty($usuario["CEP"])) {
        responderJson(422, [
            "sucesso" => false,
            "mensagem" => "Seu cadastro não tem CEP. Informe o CEP para ver a rota do caminhão."
        ]);
    }

    if (empty($usuario["Cidade"])) {
        responderJson(422, [
            "sucesso" => false,
            "mensagem" => "O CEP do seu cadastro (" . Endereco::formatarCep($usuario["CEP"]) . ") não foi encontrado."
        ]);
    }

    return [
        "usuario" => $usuario["Nome"],
        "endereco" => [
            "cep" => Endereco::formatarCep($usuario["CEP"]),
            // CEP geral de cidade não tem rua; usa o bairro ou a cidade para localizar no mapa.
            "logradouro" => $usuario["Logradouro"] ?: ($usuario["Bairro"] ?: $usuario["Cidade"]),
            "bairro" => $usuario["Bairro"] ?? "",
            "cidade" => $usuario["Cidade"],
            "uf" => $usuario["Uf"] ?? ""
        ],
        "caminhao" => CAMINHAO
    ];
}

$id = intval($_GET["id"] ?? 0);

if ($id <= 0) {
    responderJson(400, [
        "sucesso" => false,
        "mensagem" => "Informe o id do usuário."
    ]);
}

try {
    $database = new Database();
    $usuarios = new Usuario($database->conectar());

    responderJson(200, tragaDadosUsuario($usuarios, $id));
} catch (Throwable $e) {
    error_log("dados_usuario.php: " . $e->getMessage());
    responderJson(500, [
        "sucesso" => false,
        "mensagem" => "Erro interno do servidor."
    ]);
}
