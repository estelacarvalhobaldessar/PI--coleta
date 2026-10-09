import "./Meu perfil.css";


function iniciais(nome = "") {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("") || "?";
}

function formatarEndereco(endereco) {
  if (!endereco) return "Carregando endereço...";

  const partes = [endereco.cidade, endereco.uf].filter(Boolean);
  return partes.length ? partes.join(", ") : "Endereço não informado";
}

export default function MeuPerfil({ usuario, endereco, onAbrirConfiguracoes = () => {} }) {
  const nome = usuario?.nome || "Usuário";
  const pontos = Number.isFinite(Number(usuario?.pontos)) ? usuario.pontos : 0;
  const descartes = Number.isFinite(Number(usuario?.descartes)) ? usuario.descartes : 0;
  const dados = [
    { valor: nome, rotulo: "Nome completo" },
    { valor: usuario?.email || "E-mail não informado", rotulo: "E-mail" },
    { valor: endereco?.cep || "CEP não informado", rotulo: "CEP" },
    { valor: formatarEndereco(endereco), rotulo: "Cidade" },
  ];

  return (
    <main className="pf">
      <nav className="pf-navegacao" aria-label="Navegação do perfil">
        <span className="pf-aba-ativa" aria-current="page">Perfil</span>
        <button type="button" onClick={onAbrirConfiguracoes}>Configurações</button>
      </nav>

      <header className="pf-introducao">
        <h1>Meu perfil</h1>
        <p>Consulte e atualize suas informações pessoais.</p>
      </header>

      <section className="pf-conteudo" aria-label="Dados do perfil">
        <aside className="pf-cartao">
          <div className="pf-avatar" aria-label={`Iniciais de ${nome}`}>{iniciais(nome)}</div>
          <h2>{nome}</h2>
          <p>{usuario?.email || "E-mail não informado"}</p>
          <dl className="pf-estatisticas">
            <div><dt>{pontos}</dt><dd>pontos acumulados</dd></div>
            <div><dt>{descartes}</dt><dd>descartes conscientes</dd></div>
          </dl>
        </aside>

        <section className="pf-informacoes" aria-labelledby="pf-informacoes-titulo">
          <div className="pf-informacoes-topo">
            <div>
              <h2 id="pf-informacoes-titulo">Informações pessoais</h2>
              <p>Usamos esses dados para personalizar sua experiência.</p>
            </div>
            <button type="button" className="pf-editar" onClick={onAbrirConfiguracoes}>Editar perfil</button>
          </div>
          <dl className="pf-dados">
            {dados.map((dado) => (
              <div key={dado.rotulo}>
                <dt>{dado.rotulo}</dt>
                <dd>{dado.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}
