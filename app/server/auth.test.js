import assert from 'node:assert/strict'
import http from 'node:http'
import { after, before, beforeEach, describe, test } from 'node:test'
import express from 'express'
import { createAuth } from './auth.js'

// Testes da autenticação com um usuarios.php falso (não precisa de Apache nem MySQL).

const TOKEN = 'token-de-teste'
const USUARIO = { UsuarioID: 7, Nome: 'Maria', Email: 'maria@example.com' }

let phpRequests = []
let phpServer
let appServer
let baseUrl

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
}

async function api(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => null)
  return { status: response.status, data, setCookie: response.headers.get('set-cookie') }
}

async function login(email = USUARIO.Email, senha = 'segredo1') {
  const result = await api('/api/login', { method: 'POST', body: { email, senha } })
  return { ...result, cookie: result.setCookie?.split(';')[0] }
}

before(async () => {
  phpServer = http.createServer((request, response) => {
    let raw = ''
    request.on('data', (chunk) => { raw += chunk })
    request.on('end', () => {
      const body = JSON.parse(raw || '{}')
      phpRequests.push({ token: request.headers['x-api-token'], body })
      const reply = (status, data) => {
        response.writeHead(status, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(data))
      }
      if (request.headers['x-api-token'] !== TOKEN) return reply(403, { sucesso: false, mensagem: 'Acesso não autorizado.' })
      if (body.acao === 'login') {
        return body.senha === 'segredo1'
          ? reply(200, { sucesso: true, usuario: { ...USUARIO, CEP: '90020000' } })
          : reply(401, { sucesso: false, mensagem: 'E-mail ou senha inválidos.' })
      }
      if (body.acao === 'cadastrar') {
        return body.email === 'existe@example.com'
          ? reply(409, { sucesso: false, mensagem: 'E-mail já cadastrado.' })
          : reply(200, { sucesso: true, mensagem: 'Usuário cadastrado com sucesso.', id: '8' })
      }
      return reply(400, { sucesso: false, mensagem: 'Ação inválida.' })
    })
  })
  const phpPort = await listen(phpServer)

  const app = express()
  app.use(express.json())
  const auth = createAuth({ usuariosApiUrl: `http://127.0.0.1:${phpPort}/usuarios.php`, secret: 'segredo-de-teste', internalToken: TOKEN })
  auth.registerRoutes(app)
  app.get('/api/protegida', auth.requireSession, (request, response) => response.json({ usuario: request.usuario }))
  app.use((error, _request, response, next) => {
    void next
    response.status(error.status || 500).json({ error: error.message })
  })
  appServer = http.createServer(app)
  baseUrl = `http://127.0.0.1:${await listen(appServer)}`
})

after(() => {
  appServer.close()
  phpServer.close()
})

beforeEach(() => {
  phpRequests = []
})

describe('login', () => {
  test('cria sessão com cookie HttpOnly e envia o token interno ao PHP', async () => {
    const { status, data, setCookie } = await login()
    assert.equal(status, 200)
    assert.deepEqual(data.usuario, { id: 7, nome: 'Maria', email: 'maria@example.com' })
    assert.match(setCookie, /ecoleta_sessao=/)
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    assert.equal(phpRequests[0].token, TOKEN)
    assert.equal(phpRequests[0].body.acao, 'login')
  })

  test('senha errada responde 401 com a mensagem do PHP e sem cookie', async () => {
    const { status, data, setCookie } = await login(USUARIO.Email, 'errada')
    assert.equal(status, 401)
    assert.equal(data.error, 'E-mail ou senha inválidos.')
    assert.equal(setCookie, null)
  })

  test('campos vazios respondem 400 sem chamar o PHP', async () => {
    const { status } = await api('/api/login', { method: 'POST', body: { email: '', senha: '' } })
    assert.equal(status, 400)
    assert.equal(phpRequests.length, 0)
  })

  test('bloqueia após 10 senhas erradas para o mesmo e-mail', async () => {
    const email = 'bloqueio@example.com'
    for (let i = 0; i < 10; i += 1) assert.equal((await login(email, 'errada')).status, 401)
    const bloqueado = await login(email, 'segredo1')
    assert.equal(bloqueado.status, 429)
    // Outro e-mail continua liberado
    assert.equal((await login()).status, 200)
  })
})

describe('sessão', () => {
  test('rota protegida recusa sem cookie e aceita com cookie válido', async () => {
    assert.equal((await api('/api/protegida')).status, 401)
    const { cookie } = await login()
    const { status, data } = await api('/api/protegida', { cookie })
    assert.equal(status, 200)
    assert.equal(data.usuario.id, 7)
  })

  test('recusa cookie com assinatura adulterada', async () => {
    const { cookie } = await login()
    const [name, value] = cookie.split('=')
    const [payload] = value.split('.')
    const forjado = Buffer.from(JSON.stringify({ id: 1, nome: 'Admin', email: 'a@a.com', exp: Date.now() + 1e9 })).toString('base64url')
    assert.equal((await api('/api/sessao', { cookie: `${name}=${forjado}.${value.split('.')[1]}` })).status, 401)
    assert.equal((await api('/api/sessao', { cookie: `${name}=${payload}.assinaturaerrada` })).status, 401)
  })

  test('GET /api/sessao devolve o usuário logado', async () => {
    const { cookie } = await login()
    const { status, data } = await api('/api/sessao', { cookie })
    assert.equal(status, 200)
    assert.equal(data.usuario.email, 'maria@example.com')
  })

  test('logout apaga o cookie', async () => {
    const { cookie } = await login()
    const { status, setCookie } = await api('/api/logout', { method: 'POST', cookie })
    assert.equal(status, 204)
    assert.match(setCookie, /ecoleta_sessao=;/)
  })
})

describe('cadastro', () => {
  test('cadastro válido responde 201 e repassa os dados com o token', async () => {
    const body = { nome: 'João', email: 'joao@example.com', cep: '90020-000', senha: 'segredo1' }
    const { status, data } = await api('/api/cadastro', { method: 'POST', body })
    assert.equal(status, 201)
    assert.equal(data.mensagem, 'Usuário cadastrado com sucesso.')
    assert.equal(phpRequests[0].token, TOKEN)
    assert.deepEqual(phpRequests[0].body, { acao: 'cadastrar', ...body })
  })

  test('e-mail já cadastrado responde 409 com a mensagem do PHP', async () => {
    const { status, data } = await api('/api/cadastro', { method: 'POST', body: { nome: 'X', email: 'existe@example.com', cep: '90020-000', senha: 'segredo1' } })
    assert.equal(status, 409)
    assert.equal(data.error, 'E-mail já cadastrado.')
  })

  test('tipos inválidos respondem 400 sem chamar o PHP', async () => {
    const { status } = await api('/api/cadastro', { method: 'POST', body: { nome: 1, email: [], senha: {} } })
    assert.equal(status, 400)
    assert.equal(phpRequests.length, 0)
  })
})

describe('token interno', () => {
  test('token recusado pelo PHP vira 502, sem expor detalhes', async () => {
    const app = express()
    app.use(express.json())
    createAuth({ usuariosApiUrl: `http://127.0.0.1:${phpServer.address().port}/usuarios.php`, secret: 's', internalToken: 'errado' }).registerRoutes(app)
    app.use((error, _request, response, next) => {
      void next
      response.status(error.status || 500).json({ error: error.message })
    })
    const server = http.createServer(app)
    const port = await listen(server)
    const originalError = console.error
    console.error = () => {}
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'maria@example.com', senha: 'segredo1' }) })
      assert.equal(response.status, 502)
      assert.equal((await response.json()).error, 'O serviço de usuários está indisponível no momento.')
    } finally {
      console.error = originalError
      server.close()
    }
  })
})
