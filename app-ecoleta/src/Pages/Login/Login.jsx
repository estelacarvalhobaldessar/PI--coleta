
import { useState } from "react";

import "./Login.css";

function Login({ onCadastro }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    if (!email || !senha) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      setCarregando(true);

      const dados = {
        acao: "login",
        email: email,
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
      // resultado
      const resultado = await resposta.text();

      console.log("Resposta da API:", resultado);

      if (!resposta.ok) {
        alert("Erro na API: " + resultado);
        return;
      }

      let dadosResposta;
      try {
        dadosResposta = JSON.parse(resultado);
      } catch {
        alert("A API retornou uma resposta inválida.");
        return;
      }

      if (dadosResposta.sucesso === false) {
        alert(dadosResposta.mensagem || "E-mail ou senha inválidos.");
        return;
      }

      alert(
        dadosResposta.mensagem || "Login realizado com sucesso!"
      );

      console.log("Usuário logado:", dadosResposta.usuario);

    } catch (erro) {
      console.error("Erro completo no login:", erro);
      alert("Não foi possível conectar com a API.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="login-container">
      <div className="login-card">
        <h1>Bem-vindo de volta!</h1>

        <p className="login-subtitle">
          Acesse sua conta
        </p>

        <form onSubmit={handleLogin}>
          <div className="login-input-group">
            <label htmlFor="email">E-mail</label>

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="login-input-group">
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
            className="login-button"
            disabled={carregando}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button className="forgot-password">
          Esqueceu a senha?
        </button>

        <div className="register-link">
          <span>Não tem uma conta?</span>

          <button onClick={onCadastro}>
            Criar uma conta
          </button>
        </div>
      </div>
    </main>
  );
}

export default Login;
