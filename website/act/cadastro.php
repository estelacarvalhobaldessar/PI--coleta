<?php
ini_set('display_errors', '0');
header('Content-Type: text/html; charset=UTF-8');

include_once '../conexao.php';
// Mesmas regras do cadastro feito pelo app (e-mail único, CEP só com números, endereço do ViaCEP).
require_once __DIR__ . '/../../api/classes/Usuarios.php';

const NOME_MAXIMO = 20;
const EMAIL_MAXIMO = 150;
const SENHA_MINIMA = 6;

$nome = trim((string) filter_input(INPUT_POST, 'usuario'));
$email = trim((string) filter_input(INPUT_POST, 'email'));
$senha = (string) filter_input(INPUT_POST, 'senha');
$cep = trim((string) filter_input(INPUT_POST, 'cep'));

if ($nome === '' || $email === '' || $senha === '' || $cep === '') {
    echo "Preencha todos os campos obrigatórios.";
} elseif (mb_strlen($nome) > NOME_MAXIMO) {
    echo "O nome de usuário deve ter até " . NOME_MAXIMO . " caracteres.";
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > EMAIL_MAXIMO) {
    echo "Informe um e-mail válido.";
} elseif (strlen($senha) < SENHA_MINIMA) {
    echo "A senha deve ter pelo menos " . SENHA_MINIMA . " caracteres.";
} elseif (!preg_match('/^\d{5}-?\d{3}$/', $cep)) {
    echo "Informe um CEP válido (00000-000).";
} else {
    try {
        $cepVerificado = true;
        try {
            $endereco = Endereco::buscarPorCep($cep);
        } catch (RuntimeException $e) {
            // ViaCEP fora do ar: cadastra mesmo assim; o endereço é buscado no primeiro acesso ao mapa.
            error_log("website cadastro sem endereço: " . $e->getMessage());
            $endereco = null;
            $cepVerificado = false;
        }

        if ($endereco === null && $cepVerificado) {
            echo "CEP não encontrado. Confira o número digitado.";
        } else {
            $resultado = (new Usuario($conexao))->Cadastrar($nome, $email, $senha, $cep, $endereco);
            echo $resultado['sucesso'] ? "Cadastro realizado com sucesso!" : $resultado['mensagem'];
        }
    } catch (Throwable $e) {
        error_log("website cadastro: " . $e->getMessage());
        echo "Erro ao realizar o cadastro. Tente novamente.";
    }
}
