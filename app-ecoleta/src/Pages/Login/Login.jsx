import { useState } from "react";
import "./Login.css";

function Login({ onCadastro }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  function handleLogin(event) {
    event.preventDefault();

    if (!email || !senha) {
      alert("Preencha todos os campos.");
      return;
    }

    console.log("E-mail:", email);
    console.log("Senha:", senha);

    alert("Login realizado!");
  }

  return (
    <main className="login-container">
      <div className="login-card">
        <h1>Bem-vindo de volta!</h1>
        <p className="login-subtitle">Acesse sua conta</p>
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

          <button type="submit"className="login-button">Entrar</button>
        </form>

        <button className="forgot-password"> Esqueceu a senha?</button>

        <div className="register-link">
          <span>Não tem uma conta?</span>
          <button onClick={onCadastro}> Criar uma conta </button>
        </div>
      </div>
    </main>
  );
}

export default Login;