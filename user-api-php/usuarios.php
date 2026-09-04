<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

require_once "./classes/Database.php";
require_once "./classes/Usuarios.php";

$database = new Database();
$db = $database->conectar();

$usuario = new Usuario($db);

$metodo = $_SERVER["REQUEST_METHOD"];

$dados = json_decode(
    file_get_contents("php://input"),
    true
);

try {

    switch ($metodo) {

        case "POST":
            
            $acao = $dados["acao"] ?? "";
            if ($acao === "cadastrar") {
                $resultado = $usuario->Cadastrar(
                    $dados["nome"],
                    $dados["email"],
                    $dados["senha"]
                );
            } elseif ($acao === "login") {

                $resultado = $usuario->Logar(
                    $dados["email"],
                    $dados["senha"]
                );

            } elseif ($acao === "recuperarSenha") {

                $resultado = $usuario->RecuperarSenha(
                    $dados["email"],
                    $dados["novaSenha"]
                );

            } else {

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

            $resultado = [
                "sucesso" => false,
                "mensagem" => "Método não permitido."
            ];
    }

    echo json_encode($resultado);
 
} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "sucesso" => false,
        "mensagem" => "Erro interno do servidor."
    ]);
}