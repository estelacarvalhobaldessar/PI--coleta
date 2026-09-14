<?php
 
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
 
 
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
 
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}
 
$metodo = $_SERVER["REQUEST_METHOD"];
 
$conteudo = file_get_contents("php://input");
$dados = $conteudo === "" ? [] : json_decode($conteudo, true);
 
if ($conteudo !== "" && !is_array($dados)) {
    http_response_code(400);
    echo json_encode([
        "sucesso" => false,
        "mensagem" => "JSON inválido."
    ]);
    exit;
}
 
try {
    require_once __DIR__ . "/classes/Database.php";
    require_once __DIR__ . "/classes/Usuarios.php";
 
    $database = new Database();
    $db = $database->conectar();
    $usuario = new Usuario($db);
 
    switch ($metodo) {
 
        case "POST":
            
            $acao = $dados["acao"] ?? "";
            if ($acao === "cadastrar") {
                if (empty($dados["nome"]) || empty($dados["email"]) || empty($dados["senha"])) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "Nome, e-mail e senha são obrigatórios."
                    ];
                    break;
                }
 
                $resultado = $usuario->Cadastrar(
                    $dados["nome"],
                    $dados["email"],
                    $dados["senha"]
                );
            } elseif ($acao === "login") {
                if (empty($dados["email"]) || empty($dados["senha"])) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "E-mail e senha são obrigatórios."
                    ];
                    break;
                }
 
                $resultado = $usuario->Logar(
                    $dados["email"],
                    $dados["senha"]
                );
 
            } elseif ($acao === "recuperarSenha") {
                if (empty($dados["email"]) || empty($dados["novaSenha"])) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "E-mail e nova senha são obrigatórios."
                    ];
                    break;
                }
 
                $resultado = $usuario->RecuperarSenha(
                    $dados["email"],
                    $dados["novaSenha"]
                );
 
            } else {
                http_response_code(400);
 
                $resultado = [
                    "sucesso" => false,
                    "mensagem" => "Ação inválida."
                ];
            }
 
            break;
 
 
        case "GET":
 
            $id = intval($_GET["id"] ?? 0);
            $resultado = $usuario->Visualizar($id);
 
            break;
 
 
        case "PUT":
 
            $resultado = $usuario->Alterar(
                intval($dados["id"]),
                $dados["nome"],
                $dados["email"]
            );
 
            break;
 
 
        case "DELETE":
 
            $resultado = $usuario->Excluir(
                intval($dados["id"])
            );
 
            break;
 
 
        default:
            http_response_code(405);
            header("Allow: POST, GET, PUT, DELETE, OPTIONS");
 
            $resultado = [
                "sucesso" => false,
                "mensagem" => "Método não permitido."
            ];
    }
 
} catch (Throwable $e) {
 
    http_response_code(500);
    error_log("Erro na API de usuários: " . $e->getMessage());
 
    $resultado = [
        "sucesso" => false,
        "mensagem" => "Erro interno do servidor."
    ];
}
 
echo json_encode(
    $resultado,
    JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
);
 