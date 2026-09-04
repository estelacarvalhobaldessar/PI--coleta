
import { useState } from "react";

import "./Cadastro.css";

function Cadastro({ onLogin }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  function handleCep(event) {
    let valor = event.target.value.replace(/\D/g, "");

    if (valor.length > 8) {
      valor = valor.substring(0, 8);
    }

    if (valor.length > 5) {
      valor = valor.replace(/^(\d{5})(\d)/, "$1-$2");
    }

    setCep(valor);
  }

  async function handleCadastro(event) {
    event.preventDefault();

    if (!nome || !email || !cep || !senha) {
      alert("Preencha todos os campos.");
      return;
    }

    if (cep.length !== 9) {
      alert("Digite um CEP válido.");
      return;
    }

    try {
      setCarregando(true);

      const dados = {
        acao: "cadastrar",
        id: "",
        email: email,
        nome: nome,
        cep: cep,
        senha: senha
      };

      const resposta = await fetch(
        "http://localhost:8080/user-api-php/usuarios.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dados)
        }
      );

      const resultado = await resposta.text();

      console.log("Resposta da API:", resultado);

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem || "Erro ao realizar o cadastro."
        );
      }

      alert("Cadastro realizado com sucesso!");

      setNome("");
      setEmail("");
      setCep("");
      setSenha("");

      onLogin();
    } catch (erro) {
      console.error("Erro no cadastro:", erro);
      alert(erro.message || "Não foi possível realizar o cadastro.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="cadastro-container">
      <div className="cadastro-card">
        <h1>Crie sua conta</h1>

        <p className="cadastro-subtitle">
          Cadastre-se para utilizar a plataforma
        </p>

        <form onSubmit={handleCadastro}>
          <div className="cadastro-input-group">
            <label htmlFor="nome">Nome</label>

            <input
              id="nome"
              type="text"
              placeholder="Digite seu nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>

          <div className="cadastro-input-group">
            <label htmlFor="email">E-mail</label>

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="cadastro-input-group">
            <label htmlFor="cep">CEP</label>

            <input
              id="cep"
              type="text"
              placeholder="00000-000"
              value={cep}
              onChange={handleCep}
              maxLength="9"
            />
          </div>

          <div className="cadastro-input-group">
            <label htmlFor="senha">Senha</label>

            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="cadastro-button"
            disabled={carregando}
          >
            {carregando ? "Cadastrando..." : "Criar conta"}
          </button>
        </form>

        <div className="login-link">
          <span>Já tem uma conta?</span>

          <button onClick={onLogin}>
            Entrar
          </button>
        </div>
      </div>
    </main>
  );
}

export default Cadastro;
