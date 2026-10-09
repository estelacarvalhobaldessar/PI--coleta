<?php
 
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
 
 
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/classes/Api.php";

// Só o servidor Express chama esta API (veja classes/Api.php).
exigirTokenInterno();

const NOME_MAXIMO = 20;      // tamanho da coluna Nome
const EMAIL_MAXIMO = 150;    // tamanho da coluna Email
const SENHA_MINIMA = 6;
 
$metodo = $_SERVER["REQUEST_METHOD"];
 
$conteudo = file_get_contents("php://input");
$dados = $conteudo === "" ? [] : json_decode($conteudo, true);
 
if ($conteudo !== "" && !is_array($dados)) {
    responderJson(400, [
        "sucesso" => false,
        "mensagem" => "JSON inválido."
    ]);
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
                $nome = trim((string) ($dados["nome"] ?? ""));
                $email = trim((string) ($dados["email"] ?? ""));
                $senha = (string) ($dados["senha"] ?? "");
                $cep = trim((string) ($dados["cep"] ?? ""));

                if ($nome === "" || $email === "" || $senha === "") {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "Nome, e-mail e senha são obrigatórios."
                    ];
                    break;
                }

                if (mb_strlen($nome) > NOME_MAXIMO) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "O nome deve ter até " . NOME_MAXIMO . " caracteres."
                    ];
                    break;
                }

                if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > EMAIL_MAXIMO) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "Informe um e-mail válido."
                    ];
                    break;
                }

                if (strlen($senha) < SENHA_MINIMA) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "A senha deve ter pelo menos " . SENHA_MINIMA . " caracteres."
                    ];
                    break;
                }

                // O CEP é obrigatório: é dele que sai o endereço usado na rota do caminhão.
                if (!preg_match('/^\d{5}-?\d{3}$/', $cep)) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "Informe um CEP válido (00000-000)."
                    ];
                    break;
                }

                $cepVerificado = true;
                try {
                    $endereco = Endereco::buscarPorCep($cep);
                } catch (RuntimeException $e) {
                    // ViaCEP fora do ar: cadastra mesmo assim; o endereço é buscado no primeiro acesso ao mapa.
                    error_log("Cadastro sem endereço: " . $e->getMessage());
                    $endereco = null;
                    $cepVerificado = false;
                }

                if ($endereco === null && $cepVerificado) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "CEP não encontrado. Confira o número digitado."
                    ];
                    break;
                }

                $resultado = $usuario->Cadastrar(
                    $nome,
                    $email,
                    $senha,
                    $cep,
                    $endereco
                );

                if ($resultado["sucesso"] !== true) {
                    http_response_code(409);
                }
            } elseif ($acao === "login") {
                if (trim((string) ($dados["email"] ?? "")) === "" || (string) ($dados["senha"] ?? "") === "") {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "E-mail e senha são obrigatórios."
                    ];
                    break;
                }
 
                $resultado = $usuario->Logar(
                    trim((string) $dados["email"]),
                    (string) $dados["senha"]
                );

                if ($resultado["sucesso"] !== true) {
                    http_response_code(401);
                }
 
            } elseif ($acao === "recuperarSenha") {
                if (empty($dados["email"]) || empty($dados["novaSenha"])) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "E-mail e nova senha são obrigatórios."
                    ];
                    break;
                }
 
                if (strlen((string) $dados["novaSenha"]) < SENHA_MINIMA) {
                    http_response_code(400);
                    $resultado = [
                        "sucesso" => false,
                        "mensagem" => "A senha deve ter pelo menos " . SENHA_MINIMA . " caracteres."
                    ];
                    break;
                }

                $resultado = $usuario->RecuperarSenha(
                    trim((string) $dados["email"]),
                    (string) $dados["novaSenha"]
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

            if ($id <= 0) {
                http_response_code(400);
                $resultado = [
                    "sucesso" => false,
                    "mensagem" => "Informe o id do usuário."
                ];
                break;
            }

            $resultado = $usuario->Visualizar($id);

            if ($resultado["sucesso"] !== true) {
                http_response_code(404);
            }
 
            break;
 
 
        case "PUT":
 
            $id = intval($dados["id"] ?? 0);
            $nome = trim((string) ($dados["nome"] ?? ""));
            $email = trim((string) ($dados["email"] ?? ""));

            if ($id <= 0 || $nome === "" || mb_strlen($nome) > NOME_MAXIMO || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                $resultado = [
                    "sucesso" => false,
                    "mensagem" => "Informe id, nome (até " . NOME_MAXIMO . " caracteres) e e-mail válidos."
                ];
                break;
            }

            $resultado = $usuario->Alterar($id, $nome, $email);
 
            break;
 
 
        case "DELETE":
 
            $id = intval($dados["id"] ?? 0);

            if ($id <= 0) {
                http_response_code(400);
                $resultado = [
                    "sucesso" => false,
                    "mensagem" => "Informe o id do usuário."
                ];
                break;
            }

            $resultado = $usuario->Excluir($id);
 
            break;
 
 
        default:
            http_response_code(405);
            header("Allow: POST, GET, PUT, DELETE");
 
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
 