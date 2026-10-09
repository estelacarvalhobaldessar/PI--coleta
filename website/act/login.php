<?php
ini_set('display_errors', '0');
header('Content-Type: text/html; charset=UTF-8');

session_start();
include_once '../conexao.php';

$usuario = trim((string) filter_input(INPUT_POST, 'usuario'));
$senha = (string) filter_input(INPUT_POST, 'senha');

if ($usuario === '' || $senha === '') {
    echo "Preencha todos os campos obrigatórios.";
    exit;
}

try {
    // Aceita nome de usuário ou e-mail. Nomes podem se repetir, então confere a senha de cada um.
    $stmt = $conexao->prepare("SELECT UsuarioID, Nome, Senha FROM usuarios WHERE Nome = :nome OR Email = :email ORDER BY UsuarioID");
    $stmt->execute([':nome' => $usuario, ':email' => $usuario]);

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $user) {
        if (password_verify($senha, $user['Senha'])) {
            session_regenerate_id(true);
            $_SESSION['usuario_id'] = $user['UsuarioID'];
            $_SESSION['usuario_nome'] = $user['Nome'];

            header("Refresh: 1; URL=../inicio.html");
            echo "Bem-vindo de volta!";
            exit;
        }
    }

    echo "Usuário ou senha inválidos.";
} catch (Throwable $e) {
    error_log("website login: " . $e->getMessage());
    echo "Não foi possível fazer o login agora. Tente novamente.";
}
