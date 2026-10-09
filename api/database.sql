-- Estrutura usada pela API PHP da pasta api (usuarios.php e dados_usuario.php).
-- Instalação nova: mysql -uroot < api/database.sql
--
-- Banco que já tem a tabela usuarios sem as colunas de endereço:
--   ALTER TABLE ecoleta.usuarios
--     ADD COLUMN Logradouro VARCHAR(200) NULL AFTER CEP,
--     ADD COLUMN Bairro VARCHAR(120) NULL AFTER Logradouro,
--     ADD COLUMN Cidade VARCHAR(120) NULL AFTER Bairro,
--     ADD COLUMN Uf CHAR(2) NULL AFTER Cidade;

CREATE DATABASE IF NOT EXISTS ecoleta CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE ecoleta;

CREATE TABLE IF NOT EXISTS usuarios (
    Nome VARCHAR(20) NOT NULL,
    Senha VARCHAR(150) NOT NULL,
    UsuarioID INT NOT NULL AUTO_INCREMENT,
    Email VARCHAR(150) NOT NULL,
    -- Só números (ex.: 90020000)
    CEP VARCHAR(11) NOT NULL,
    -- Endereço obtido do CEP (ViaCEP) no cadastro ou no primeiro acesso ao mapa
    Logradouro VARCHAR(200) NULL,
    Bairro VARCHAR(120) NULL,
    Cidade VARCHAR(120) NULL,
    Uf CHAR(2) NULL,
    PRIMARY KEY (UsuarioID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
