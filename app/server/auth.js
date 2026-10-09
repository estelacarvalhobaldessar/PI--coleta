import crypto from 'node:crypto'

// Login e cadastro são feitos pela API PHP (api/usuarios.php). Este módulo só repassa as chamadas
// e guarda a sessão num cookie assinado, que protege as rotas do mapa.

const SESSION_COOKIE = 'ecoleta_sessao'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const USUARIOS_API_TIMEOUT_MS = 10_000
const LOGIN_MAX_ATTEMPTS = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

function httpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

function readCookie(request, name) {
  for (const part of (request.headers.cookie || '').split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return null
}

export function createAuth({ usuariosApiUrl, secret, internalToken }) {
  function sign(value) {
    return crypto.createHmac('sha256', secret).update(value).digest('base64url')
  }

  function createToken(usuario) {
    const payload = Buffer.from(JSON.stringify({ ...usuario, exp: Date.now() + SESSION_MAX_AGE_MS })).toString('base64url')
    return `${payload}.${sign(payload)}`
  }

  function readSession(request) {
    const token = readCookie(request, SESSION_COOKIE)
    const [payload, signature] = token?.split('.') || []
    if (!payload || !signature) return null
    const expected = Buffer.from(sign(payload))
    const received = Buffer.from(signature)
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null
    try {
      const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
      if (!Number.isFinite(session.exp) || session.exp < Date.now()) return null
      return { id: session.id, nome: session.nome, email: session.email }
    } catch {
      return null
    }
  }

  function setSessionCookie(request, response, usuario) {
    response.cookie(SESSION_COOKIE, createToken(usuario), {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.secure,
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    })
  }

  async function usuariosRequest(body) {
    let response
    try {
      response = await fetch(usuariosApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Api-Token': internalToken },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(USUARIOS_API_TIMEOUT_MS),
      })
    } catch {
      throw httpError('Não foi possível conectar ao serviço de usuários.', 502)
    }
    const data = await response.json().catch(() => null)
    if (response.status === 403) {
      console.error('usuarios.php recusou o token: confira INTERNAL_API_TOKEN no .env e api/config.php.')
      throw httpError('O serviço de usuários está indisponível no momento.', 502)
    }
    if (!data || response.status >= 500) {
      throw httpError(data?.mensagem || 'O serviço de usuários está indisponível no momento.', 502)
    }
    return { status: response.status, data }
  }

  // Limita tentativas de login por IP + e-mail para dificultar adivinhação de senha.
  const loginAttempts = new Map()
  function checkLoginAttempts(key) {
    const now = Date.now()
    for (const [storedKey, entry] of loginAttempts) {
      if (entry.resetAt < now) loginAttempts.delete(storedKey)
    }
    const entry = loginAttempts.get(key)
    if (entry && entry.count >= LOGIN_MAX_ATTEMPTS) {
      throw httpError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.', 429)
    }
  }
  function registerFailedLogin(key) {
    const entry = loginAttempts.get(key) || { count: 0, resetAt: Date.now() + LOGIN_WINDOW_MS }
    entry.count += 1
    loginAttempts.set(key, entry)
  }

  function requireSession(request, response, next) {
    const usuario = readSession(request)
    if (!usuario) {
      response.status(401).json({ error: 'Sessão expirada. Faça login novamente.' })
      return
    }
    request.usuario = usuario
    next()
  }

  function registerRoutes(app) {
    app.post('/api/cadastro', async (request, response, next) => {
      try {
        const { nome, email, cep, senha } = request.body || {}
        if (typeof nome !== 'string' || typeof email !== 'string' || typeof senha !== 'string' || (cep !== undefined && typeof cep !== 'string')) {
          throw httpError('Preencha todos os campos.', 400)
        }
        if (nome.length > 150 || email.length > 190 || senha.length > 200) {
          throw httpError('Algum campo excede o tamanho máximo permitido.', 400)
        }
        const { status, data } = await usuariosRequest({ acao: 'cadastrar', nome, email, cep, senha })
        if (data.sucesso !== true) {
          response.status(status >= 400 ? status : 400).json({ error: data.mensagem || 'Não foi possível realizar o cadastro.' })
          return
        }
        response.status(201).json({ mensagem: data.mensagem || 'Cadastro realizado com sucesso.' })
      } catch (error) {
        next(error)
      }
    })

    app.post('/api/login', async (request, response, next) => {
      try {
        const { email, senha } = request.body || {}
        if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
          throw httpError('Preencha e-mail e senha.', 400)
        }
        const attemptKey = `${request.ip}|${email.trim().toLowerCase()}`
        checkLoginAttempts(attemptKey)

        const { data } = await usuariosRequest({ acao: 'login', email, senha })
        if (data.sucesso !== true || !data.usuario) {
          registerFailedLogin(attemptKey)
          response.status(401).json({ error: data.mensagem || 'E-mail ou senha inválidos.' })
          return
        }

        loginAttempts.delete(attemptKey)
        const usuario = { id: data.usuario.UsuarioID, nome: data.usuario.Nome, email: data.usuario.Email }
        setSessionCookie(request, response, usuario)
        response.json({ usuario })
      } catch (error) {
        next(error)
      }
    })

    app.get('/api/sessao', (request, response) => {
      const usuario = readSession(request)
      if (!usuario) {
        response.status(401).json({ error: 'Nenhuma sessão ativa.' })
        return
      }
      response.json({ usuario })
    })

    app.post('/api/logout', (_request, response) => {
      response.clearCookie(SESSION_COOKIE, { path: '/' })
      response.status(204).end()
    })
  }

  return { registerRoutes, requireSession }
}
