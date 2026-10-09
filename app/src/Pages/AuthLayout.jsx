import caminhaoUrl from "../assets/caminhao.png";
import folhasUrl from "../assets/folhas.svg";
import "./auth.css";

// Moldura comum das telas de Login e Cadastro: marca, cartão, mensagem e folhagem.
function AuthLayout({ titulo, subtitulo, mensagem, rodape, children }) {
  return (
    <main className="auth">
      <img className="auth-folhas auth-folhas-esq" src={folhasUrl} alt="" aria-hidden="true" />
      <img className="auth-folhas auth-folhas-dir" src={folhasUrl} alt="" aria-hidden="true" />

      <div className="auth-conteudo">
        <div className="auth-marca">
          <img src={caminhaoUrl} alt="" />
          <span>ÉCOLETA</span>
        </div>

        <div className="auth-card">
          <h1>{titulo}</h1>
          <p className="auth-subtitulo">{subtitulo}</p>

          {mensagem && (
            <p className={`auth-mensagem auth-mensagem-${mensagem.tipo}`} role={mensagem.tipo === "erro" ? "alert" : "status"}>
              {mensagem.texto}
            </p>
          )}

          {children}

          <div className="auth-rodape">{rodape}</div>
        </div>
      </div>
    </main>
  );
}

export default AuthLayout;
