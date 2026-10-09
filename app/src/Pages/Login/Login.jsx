import { useState } from "react";
import AuthLayout from "../AuthLayout";
import { apiFetch } from "../../api";

function Login({ onCadastro, onLogin, aviso, emailInicial = "" }) {
  const [email, setEmail] = useState(emailInicial);
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState(aviso || null);

  async function handleLogin(event) {
    event.preventDefault();

    if (!email.trim() || !senha) {
      setMensagem({ tipo: "erro", texto: "Preencha todos os campos." });
      return;
    }

    try {
      setCarregando(true);
      setMensagem(null);

      const resposta = await apiFetch("/api/login", {
        method: "POST",
        body: { email: email.trim(), senha },
      });

      if (!resposta.ok) {
        setMensagem({ tipo: "erro", texto: resposta.data.error || "E-mail ou senha inválidos." });
        return;
      }

      onLogin(resposta.data.usuario);
    } catch (erro) {
      console.error("Erro completo no login:", erro);
      setMensagem({ tipo: "erro", texto: "Não foi possível conectar com o servidor." });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Bem-vindo de volta!"
      subtitulo="Acesse sua conta"
      mensagem={mensagem}
      rodape={
        <>
          <span>Não tem uma conta?</span>
          <button type="button" onClick={onCadastro}>
            Criar uma conta
          </button>
        </>
      }
    >
      <form onSubmit={handleLogin} noValidate>
        <div className="auth-campo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="auth-campo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />
        </div>

        <button type="submit" className="auth-botao" disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <button
        type="button"
        className="auth-link-secundario"
        onClick={() => setMensagem({ tipo: "info", texto: "A recuperação de senha ainda não está disponível." })}
      >
        Esqueceu a senha?
      </button>
    </AuthLayout>
  );
}

export default Login;
