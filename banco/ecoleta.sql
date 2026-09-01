-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 25/08/2026 às 21:44
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `ecoleta`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `bairros`
--

CREATE TABLE `bairros` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `cidade` varchar(100) NOT NULL DEFAULT 'Porto Alegre',
  `estado` char(2) NOT NULL DEFAULT 'RS',
  `coleta_domiciliar` tinyint(1) DEFAULT 1,
  `coleta_seletiva` tinyint(1) DEFAULT 1,
  `coleta_automatizada` varchar(20) DEFAULT 'nao_informado',
  `observacao` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `caminhoes`
--

CREATE TABLE `caminhoes` (
  `id` int(11) NOT NULL,
  `identificacao` varchar(50) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `status` enum('indisponivel','em_deslocamento','coletando','finalizado') DEFAULT 'indisponivel',
  `ultima_atualizacao` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `ecopontos`
--

CREATE TABLE `ecopontos` (
  `id` int(11) NOT NULL,
  `nome` varchar(150) NOT NULL,
  `endereco` varchar(200) DEFAULT NULL,
  `bairro_id` int(11) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `materiais` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `logradouros`
--

CREATE TABLE `logradouros` (
  `id` int(11) NOT NULL,
  `bairro_id` int(11) NOT NULL,
  `nome` varchar(150) NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `programacoes_coleta`
--

CREATE TABLE `programacoes_coleta` (
  `id` int(11) NOT NULL,
  `logradouro_id` int(11) NOT NULL,
  `tipo_coleta` enum('domiciliar','seletiva') NOT NULL,
  `dia_semana` varchar(20) DEFAULT NULL,
  `turno` enum('manha','tarde','noite') DEFAULT NULL,
  `horario_inicio` time DEFAULT NULL,
  `horario_fim` time DEFAULT NULL,
  `observacao` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `Nome` varchar(20) NOT NULL,
  `Senha` varchar(150) NOT NULL,
  `UsuarioID` int(11) NOT NULL,
  `Email` varchar(150) NOT NULL,
  `CEP` varchar(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuarios`
--

INSERT INTO `usuarios` (`Nome`, `Senha`, `UsuarioID`, `Email`, `CEP`) VALUES
('mariaeduarda2309', '$2y$10$N7wYGbRgRiiz4t.pUoFNxOAVLl4rcmtiSSj92inPSx.Zb2YvTezXS', 3, 'dudasummchen@gmail.com', '90830244'),
('cassiano.ramos', '$2y$10$HdyT3OTSdZOL62clGVxbiOJ9gv/bKDtkbIbb/16OtNJiz1wcygCja', 4, 'cassianoramos@gmail.com', '91000000'),
('TETEUZINHO01', '$2y$10$yk/j3IM.SGpfQzPCdUbNDe0iZ5ltcb3agA1GR7OcfRjRPL/CYSNsa', 5, 'ILIHBYGY@gmail.com', '90690200'),
('joao goty', '$2y$10$hpdS.pzWvno0AJeapLaCR.HXD23.efGoOQMcompE9ZZIcZ0DQfFZC', 6, 'goty@hotmail.com', '90250730'),
('William de Campos Vi', '$2y$10$Xs8pp4QBeDm7dLntrH61cOajqteXz4VmwCk9zXNNL/N5zG0GFotke', 7, 'willgordo@gmail.com', '98772213'),
('William de Campos Vi', '$2y$10$Xs8pp4QBeDm7dLntrH61cOajqteXz4VmwCk9zXNNL/N5zG0GFotke', 8, 'willgordo@gmail.com', '98772213'),
('dudinha', '$2y$10$zFNbkIZDpgsrM2yipuR4ou.fGAozV41qS8YjdeT9xKrZRPdRWuzeC', 9, 'dudinha@gmail.com', '');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `bairros`
--
ALTER TABLE `bairros`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nome` (`nome`);

--
-- Índices de tabela `caminhoes`
--
ALTER TABLE `caminhoes`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `ecopontos`
--
ALTER TABLE `ecopontos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bairro_id` (`bairro_id`);

--
-- Índices de tabela `logradouros`
--
ALTER TABLE `logradouros`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bairro_id` (`bairro_id`);

--
-- Índices de tabela `programacoes_coleta`
--
ALTER TABLE `programacoes_coleta`
  ADD PRIMARY KEY (`id`),
  ADD KEY `logradouro_id` (`logradouro_id`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`UsuarioID`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `bairros`
--
ALTER TABLE `bairros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `caminhoes`
--
ALTER TABLE `caminhoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `ecopontos`
--
ALTER TABLE `ecopontos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `logradouros`
--
ALTER TABLE `logradouros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `programacoes_coleta`
--
ALTER TABLE `programacoes_coleta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `UsuarioID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `ecopontos`
--
ALTER TABLE `ecopontos`
  ADD CONSTRAINT `ecopontos_ibfk_1` FOREIGN KEY (`bairro_id`) REFERENCES `bairros` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `logradouros`
--
ALTER TABLE `logradouros`
  ADD CONSTRAINT `logradouros_ibfk_1` FOREIGN KEY (`bairro_id`) REFERENCES `bairros` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `programacoes_coleta`
--
ALTER TABLE `programacoes_coleta`
  ADD CONSTRAINT `programacoes_coleta_ibfk_1` FOREIGN KEY (`logradouro_id`) REFERENCES `logradouros` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
