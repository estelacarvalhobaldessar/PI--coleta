import { useState } from "react";
import AuthLayout from "../AuthLayout";
import { apiFetch } from "../../api";

const SENHA_MINIMA = 6;
const NOME_MAXIMO = 20; // tamanho da coluna Nome no banco

function Cadastro({ onLogin, onCadastrado }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

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

    if (!nome.trim() || !email.trim() || !cep || !senha) {
      setMensagem({ tipo: "erro", texto: "Preencha todos os campos." });
      return;
    }

    if (nome.trim().length > NOME_MAXIMO) {
      setMensagem({ tipo: "erro", texto: `O nome deve ter até ${NOME_MAXIMO} caracteres.` });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMensagem({ tipo: "erro", texto: "Digite um e-mail válido." });
      return;
    }

    if (cep.length !== 9) {
      setMensagem({ tipo: "erro", texto: "Digite um CEP válido." });
      return;
    }

    if (senha.length < SENHA_MINIMA) {
      setMensagem({ tipo: "erro", texto: `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` });
      return;
    }

    try {
      setCarregando(true);
      setMensagem(null);

      const resposta = await apiFetch("/api/cadastro", {
        method: "POST",
        body: { nome: nome.trim(), email: email.trim(), cep, senha },
      });

      if (!resposta.ok) {
        setMensagem({ tipo: "erro", texto: resposta.data.error || "Não foi possível realizar o cadastro." });
        return;
      }

      onCadastrado(email.trim());
    } catch (erro) {
      console.error("Erro no cadastro:", erro);
      setMensagem({ tipo: "erro", texto: "Não foi possível conectar com o servidor." });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Crie sua conta"
      subtitulo="Cadastre-se para utilizar a plataforma"
      mensagem={mensagem}
      rodape={
        <>
          <span>Já tem uma conta?</span>
          <button type="button" onClick={onLogin}>
            Entrar
          </button>
        </>
      }
    >
      <form onSubmit={handleCadastro} noValidate>
        <div className="auth-campo">
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            type="text"
            autoComplete="name"
            placeholder="Digite seu nome"
            maxLength={NOME_MAXIMO}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
          />
        </div>

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
          <label htmlFor="cep">CEP</label>
          <input
            id="cep"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cep}
            onChange={handleCep}
            maxLength="9"
          />
        </div>

        <div className="auth-campo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="new-password"
            placeholder="Digite sua senha"
            aria-describedby="senha-dica"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />
          <small id="senha-dica" className="auth-dica">Mínimo de {SENHA_MINIMA} caracteres.</small>
        </div>

        <button type="submit" className="auth-botao" disabled={carregando}>
          {carregando ? "Cadastrando..." : "Criar conta"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Cadastro;
