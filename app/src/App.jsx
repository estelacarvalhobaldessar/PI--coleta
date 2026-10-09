import { useCallback, useEffect, useState } from 'react'
import Login from './Pages/Login/Login'
import Cadastro from './Pages/Cadastro/Cadastro'
import Mapa from './Pages/Mapa/Mapa'
import { clearRouteCache } from './Pages/Mapa/routeCache'
import caminhaoUrl from './assets/caminhao.png'
import { apiFetch } from './api'
import './Pages/auth.css'

// Sem sessão: Login (ou Cadastro). Com sessão: Mapa. O servidor também recusa as rotas do mapa sem login.
function App() {
  const [sessao, setSessao] = useState({ estado: 'carregando', usuario: null })
  const [pagina, setPagina] = useState('login')
  const [aviso, setAviso] = useState(null)
  const [emailLogin, setEmailLogin] = useState('')

  useEffect(() => {
    apiFetch('/api/sessao')
      .then((resposta) => setSessao(resposta.ok
        ? { estado: 'logado', usuario: resposta.data.usuario }
        : { estado: 'anonimo', usuario: null }))
      .catch(() => setSessao({ estado: 'anonimo', usuario: null }))
  }, [])

  const encerrarSessao = useCallback((mensagem) => {
    clearRouteCache()
    setSessao({ estado: 'anonimo', usuario: null })
    setPagina('login')
    setAviso(mensagem ? { id: Date.now(), tipo: 'info', texto: mensagem } : null)
  }, [])

  const sair = useCallback(async () => {
    await apiFetch('/api/logout', { method: 'POST' }).catch(() => null)
    encerrarSessao()
  }, [encerrarSessao])

  const sessaoExpirada = useCallback(() => {
    encerrarSessao('Sua sessão expirou. Faça login novamente.')
  }, [encerrarSessao])

  if (sessao.estado === 'carregando') {
    return (
      <div className='auth-carregando' role='status' aria-label='Carregando'>
        <img src={caminhaoUrl} alt='' />
      </div>
    )
  }

  if (sessao.estado === 'logado') {
    return <Mapa key={sessao.usuario.id} usuarioId={sessao.usuario.id} usuarioSessao={sessao.usuario} onSair={sair} onSessaoExpirada={sessaoExpirada} />
  }

  if (pagina === 'cadastro') {
    return (
      <Cadastro
        onLogin={() => {
          setAviso(null)
          setPagina('login')
        }}
        onCadastrado={(email) => {
          setEmailLogin(email)
          setAviso({ id: Date.now(), tipo: 'sucesso', texto: 'Cadastro realizado com sucesso! Faça login para continuar.' })
          setPagina('login')
        }}
      />
    )
  }

  return (
    <Login
      key={aviso?.id ?? 'login'}
      aviso={aviso}
      emailInicial={emailLogin}
      onCadastro={() => setPagina('cadastro')}
      onLogin={(usuario) => {
        setAviso(null)
        setSessao({ estado: 'logado', usuario })
      }}
    />
  )
}

export default App
