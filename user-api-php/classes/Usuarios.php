<?php

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
        string $senha
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
                (Nome, Email, Senha)
                VALUES
                (:nome, :email, :senha)";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":nome" => $nome,
            ":email" => $email,
            ":senha" => $senhaHash
        ]);

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

        $sql = "SELECT USuarioID, Nome, Email
                FROM usuarios
                WHERE USuarioID = :id
                LIMIT 1";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ":id" => $id
        ]);

        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
        var_dump($usuario);exit();
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