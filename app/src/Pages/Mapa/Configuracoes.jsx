import { useState } from 'react'
import './Configuracoes.css'

function Alternador({ ativo, onChange, id }) {
  return <button id={id} className={`config-alternador${ativo ? ' config-alternador-ativo' : ''}`} type='button' role='switch' aria-checked={ativo} onClick={() => onChange(!ativo)}><span /></button>
}

export default function Configuracoes({ onVoltar, onAbrirPerfil }) {
  const [notificacoes, setNotificacoes] = useState(true)
  const [lembretes, setLembretes] = useState(true)
  const [modoEscuro, setModoEscuro] = useState(false)

  return (
    <main className='config'>
      <nav className='config-navegacao' aria-label='Navegação da conta'><button type='button' onClick={onAbrirPerfil}>Perfil</button><span aria-current='page'>Configurações</span></nav>
      <header className='config-introducao'><h1>Configurações</h1><p>Personalize sua experiência no Ecoleta.</p></header>
      <div className='config-conteudo'>
        <section className='config-secao' aria-labelledby='config-notificacoes'>
          <div className='config-secao-titulo'><span className='config-icone' aria-hidden='true'>🔔</span><div><h2 id='config-notificacoes'>Notificações</h2><p>Escolha quais avisos deseja receber.</p></div></div>
          <div className='config-opcao'><label htmlFor='notificacoes'>Notificações do aplicativo <small>Receba atualizações importantes sobre sua coleta.</small></label><Alternador id='notificacoes' ativo={notificacoes} onChange={setNotificacoes} /></div>
          <div className='config-opcao'><label htmlFor='lembretes'>Lembretes de descarte <small>Receba lembretes para separar seus recicláveis.</small></label><Alternador id='lembretes' ativo={lembretes} onChange={setLembretes} /></div>
        </section>
        <section className='config-secao' aria-labelledby='config-aparencia'>
          <div className='config-secao-titulo'><span className='config-icone' aria-hidden='true'>◐</span><div><h2 id='config-aparencia'>Aparência</h2><p>Defina como o aplicativo aparece para você.</p></div></div>
          <div className='config-opcao'><label htmlFor='modo-escuro'>Modo escuro <small>Use tons mais escuros para navegar à noite.</small></label><Alternador id='modo-escuro' ativo={modoEscuro} onChange={setModoEscuro} /></div>
        </section>
        <section className='config-secao config-secao-conta' aria-labelledby='config-conta'>
          <div className='config-secao-titulo'><span className='config-icone' aria-hidden='true'>⚙</span><div><h2 id='config-conta'>Conta</h2><p>Atualize seus dados pessoais no seu perfil.</p></div></div>
          <button className='config-link' type='button' onClick={onAbrirPerfil}>Ir para meu perfil <span aria-hidden='true'>→</span></button>
        </section>
      </div>
      <button className='config-voltar' type='button' onClick={onVoltar}>Voltar</button>
    </main>
  )
}
