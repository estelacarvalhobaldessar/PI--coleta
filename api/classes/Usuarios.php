<?php

require_once __DIR__ . "/Endereco.php";

class Usuario
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // =========================
    // CADASTRAR
    // =========================

    public function Cadastrar(
        string $nome,
        string $email,
        string $senha,
        ?string $cep = null,
        ?array $endereco = null
    ): array {
        
        // Verifica se o e-mail já existe
        if ($this->ExisteCadastro($email)) {
            return [
                "sucesso" => false,
                "mensagem" => "E-mail já cadastrado."
            ];
        }
        
        // Criptografa a senha
        $senhaHash = password_hash(
            $senha,
            PASSWORD_DEFAULT
        );

        $sql = "INSERT INTO usuarios
                (Nome, Email, Senha, CEP, Logradouro, Bairro, Cidade, Uf)
                VALUES
                (:nome, :email, :senha, :cep, :logradouro, :bairro, :cidade, :uf)";

        $stmt = $this->db->prepare($sql);

        try {
            $stmt->execute([
                ":nome" => $nome,
                ":email" => $email,
                ":senha" => $senhaHash,
                // A tabela guarda o CEP só com números (ex.: 90020000)
                ":cep" => $cep === null ? "" : Endereco::somenteDigitos($cep),
                ":logradouro" => $endereco["logradouro"] ?? null,
                ":bairro" => $endereco["bairro"] ?? null,
                ":cidade" => $endereco["cidade"] ?? null,
                ":uf" => $endereco["uf"] ?? null
            ]);
        } catch (PDOException $e) {
            // Dois cadastros simultâneos com o mesmo e-mail
            if ($e->getCode() === "23000") {
                return [
                    "sucesso" => false,
                    "mensagem" => "E-mail já cadastrado."
                ];
            }
            throw $e;
        }

        return [
            "sucesso" => true,
            "mensagem" => "Usuário cadastrado com sucesso.",
            "id" => $this->db->lastInsertId()
        ];
    }


    // =========================
    // LOGIN
    // =========================

    public function Logar(
        string $email,
        string $senha
    ): array {

        $sql = "SELECT *
                FROM usuarios
                WHERE Email = :email
                ORDER BY UsuarioID
                LIMIT 1";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":email" => $email
        ]);

        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            return [
                "sucesso" => false,
                "mensagem" => "E-mail ou senha inválidos."
            ];
        }

        if (!password_verify($senha, $usuario["Senha"])) {
            return [
                "sucesso" => false,
                "mensagem" => "E-mail ou senha inválidos."
            ];
        }

        // Nunca enviar a senha para o React
        unset($usuario["Senha"]);

        return [
            "sucesso" => true,
            "mensagem" => "Login realizado com sucesso.",
            "usuario" => $usuario
        ];
    }


    // =========================
    // EXISTE CADASTRO
    // =========================

    public function ExisteCadastro(
        string $email
    ): bool {

        $sql = "SELECT UsuarioID
                FROM usuarios
                WHERE Email = :email
                LIMIT 1";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":email" => $email
        ]);

        return $stmt->fetch() !== false;
    }


    // =========================
    // VISUALIZAR
    // =========================

    public function Visualizar(
        int $id
    ): array {

        $sql = "SELECT UsuarioID, Nome, Email, CEP
                FROM usuarios
                WHERE UsuarioID = :id
                LIMIT 1";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":id" => $id
        ]);

        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            return [
                "sucesso" => false,
                "mensagem" => "Usuário não encontrado."
            ];
        }

        return [
            "sucesso" => true,
            "usuario" => $usuario
        ];
    }


    // =========================
    // ENDEREÇO (para a rota do caminhão)
    // =========================

    // Retorna nome e endereço do usuário. Se o endereço ainda não foi gravado,
    // busca pelo CEP no ViaCEP e grava para as próximas consultas.
    public function BuscarEndereco(
        int $id
    ): ?array {

        $sql = "SELECT UsuarioID, Nome, CEP, Logradouro, Bairro, Cidade, Uf
                FROM usuarios
                WHERE UsuarioID = :id
                LIMIT 1";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":id" => $id
        ]);

        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            return null;
        }

        if (empty($usuario["Cidade"]) && !empty($usuario["CEP"])) {
            $endereco = Endereco::buscarPorCep($usuario["CEP"]);

            if ($endereco !== null) {
                $update = $this->db->prepare(
                    "UPDATE usuarios
                     SET Logradouro = :logradouro, Bairro = :bairro, Cidade = :cidade, Uf = :uf
                     WHERE UsuarioID = :id"
                );
                $update->execute([
                    ":logradouro" => $endereco["logradouro"],
                    ":bairro" => $endereco["bairro"],
                    ":cidade" => $endereco["cidade"],
                    ":uf" => $endereco["uf"],
                    ":id" => $id
                ]);

                $usuario["Logradouro"] = $endereco["logradouro"];
                $usuario["Bairro"] = $endereco["bairro"];
                $usuario["Cidade"] = $endereco["cidade"];
                $usuario["Uf"] = $endereco["uf"];
            }
        }

        return $usuario;
    }


    // =========================
    // ALTERAR
    // =========================

    public function Alterar(
        int $id,
        string $nome,
        string $email
    ): array {

        $sql = "UPDATE usuarios
                SET Nome = :nome,
                    Email = :email
                WHERE UsuarioID = :id";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":id" => $id,
            ":nome" => $nome,
            ":email" => $email
        ]);

        if ($stmt->rowCount() === 0) {
            return [
                "sucesso" => false,
                "mensagem" => "Nenhum dado foi alterado."
            ];
        }

        return [
            "sucesso" => true,
            "mensagem" => "Dados alterados com sucesso."
        ];
    }


    // =========================
    // EXCLUIR
    // =========================

    public function Excluir(
        int $id
    ): array {

        $sql = "DELETE FROM usuarios
                WHERE UsuarioID = :id";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":id" => $id
        ]);

        if ($stmt->rowCount() === 0) {
            return [
                "sucesso" => false,
                "mensagem" => "Usuário não encontrado."
            ];
        }

        return [
            "sucesso" => true,
            "mensagem" => "Usuário excluído com sucesso."
        ];
    }


    // =========================
    // RECUPERAR SENHA
    // =========================

    public function RecuperarSenha(
        string $email,
        string $novaSenha
    ): array {

        if (!$this->ExisteCadastro($email)) {
            return [
                "sucesso" => false,
                "mensagem" => "E-mail não cadastrado."
            ];
        }

        $senhaHash = password_hash(
            $novaSenha,
            PASSWORD_DEFAULT
        );

        $sql = "UPDATE usuarios
                SET Senha = :senha
                WHERE Email = :email";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":senha" => $senhaHash,
            ":email" => $email
        ]);

        return [
            "sucesso" => true,
            "mensagem" => "Senha alterada com sucesso."
        ];
    }
}