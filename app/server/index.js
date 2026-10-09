import { ENV_FILE } from './env.js'
import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAuth } from './auth.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 8787)
const apiKey = process.env.ORS_API_KEY?.trim()
// Endereço da API PHP no Apache, montado com APACHE_HOST, APACHE_PORT e API_PATH do .env.
const API_BASE_URL = `http://${process.env.APACHE_HOST?.trim() || 'localhost'}:${process.env.APACHE_PORT?.trim() || '80'}${process.env.API_PATH?.trim() || '/ecoleta/api'}`.replace(/\/+$/, '')
const USER_API_URL = process.env.USER_API_URL?.trim() || `${API_BASE_URL}/dados_usuario.php`
const USER_API_FILE = path.resolve(process.env.USER_API_FILE?.trim() || path.join(currentDirectory, '..', '..', 'api', 'dados_usuario.php'))
const USER_API_TIMEOUT_MS = 10_000
const USUARIOS_API_URL = process.env.USUARIOS_API_URL?.trim() || `${API_BASE_URL}/usuarios.php`
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex')
// Token que a API PHP (pasta api) exige no cabeçalho X-Api-Token (o mesmo INTERNAL_API_TOKEN do .env).
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN?.trim() || ''
if (!INTERNAL_API_TOKEN) {
  console.warn(`INTERNAL_API_TOKEN não definido em ${ENV_FILE}: a API PHP (pasta api) vai recusar as chamadas.`)
}
if (!process.env.SESSION_SECRET?.trim()) {
  console.warn(`SESSION_SECRET não definido em ${ENV_FILE}: as sessões serão perdidas quando o servidor reiniciar.`)
}
// O opcache do PHP leva até ~2s para enxergar o arquivo salvo, então o servidor consulta de novo algumas vezes.
const USER_FILE_REFETCH_DELAYS_MS = [150, 1000, 2500, 4000]
const USER_STREAM_HEARTBEAT_MS = 25_000
const ORS_DIRECTIONS_URL = 'https://api.heigit.org/openrouteservice/v2/directions'
const ORS_GEOCODE_URL = 'https://api.heigit.org/pelias/v1'
const ORS_TIMEOUT_MS = 15_000
const ORS_ERROR_MESSAGES = {
  2009: 'Não foi possível encontrar uma rota para um caminhão com essas dimensões entre os endereços informados. As vias no trajeto podem não suportar o porte do veículo — tente reduzir altura, largura, comprimento, peso ou carga por eixo, ou confira se os endereços estão corretos.',
}
const DEFAULT_RESTRICTIONS = {
  height: 3.0,
  width: 3.7,
  length: 10.0,
  weight: 12,
  axleload: 6,
}

app.use(express.json({ limit: '50kb' }))
app.disable('x-powered-by')

const auth = createAuth({ usuariosApiUrl: USUARIOS_API_URL, secret: SESSION_SECRET, internalToken: INTERNAL_API_TOKEN })
auth.registerRoutes(app)

function assertApiKey() {
  if (!apiKey) {
    const error = new Error('Configure ORS_API_KEY no ambiente do servidor antes de calcular a rota.')
    error.status = 503
    throw error
  }
}

function createHttpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

function parsePositiveNumber(value, fallback, label) {
  const parsed = value === undefined ? fallback : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createHttpError(`${label} deve ser um número maior que zero.`, 400)
  }
  return parsed
}

function parseAddress(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(`Informe o endereço de ${label} corretamente.`, 400)
  }
  const address = typeof value.address === 'string' ? value.address.trim() : ''
  const locality = typeof value.locality === 'string' ? value.locality.trim() : ''
  const region = typeof value.region === 'string' ? value.region.trim() : ''
  const neighbourhood = typeof value.neighbourhood === 'string' ? value.neighbourhood.trim() : ''
  if (!address || !locality) {
    throw createHttpError(`Informe rua/número e cidade para ${label}.`, 400)
  }
  if (address.length > 200 || locality.length > 120 || region.length > 60 || neighbourhood.length > 120) {
    throw createHttpError(`Endereço de ${label} excede o tamanho máximo permitido.`, 400)
  }
  return { address, locality, region, neighbourhood }
}

function parseVehicle(vehicle) {
  if (vehicle === null || typeof vehicle !== 'object' || Array.isArray(vehicle)) {
    throw createHttpError('Os dados do caminhão são inválidos.', 400)
  }
  if (vehicle.hazmat !== undefined && typeof vehicle.hazmat !== 'boolean') {
    throw createHttpError('A indicação de carga perigosa deve ser verdadeira ou falsa.', 400)
  }
  return {
    height: parsePositiveNumber(vehicle.height, DEFAULT_RESTRICTIONS.height, 'Altura'),
    width: parsePositiveNumber(vehicle.width, DEFAULT_RESTRICTIONS.width, 'Largura'),
    length: parsePositiveNumber(vehicle.length, DEFAULT_RESTRICTIONS.length, 'Comprimento'),
    weight: parsePositiveNumber(vehicle.weight, DEFAULT_RESTRICTIONS.weight, 'Peso'),
    axleload: parsePositiveNumber(vehicle.axleload, DEFAULT_RESTRICTIONS.axleload, 'Carga por eixo'),
    hazmat: vehicle.hazmat ?? false,
  }
}

async function orsRequest(url, options = {}) {
  assertApiKey()
  let response
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || AbortSignal.timeout(ORS_TIMEOUT_MS),
      headers: {
        Authorization: apiKey,
        Accept: 'application/json, application/geo+json',
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw createHttpError('O openrouteservice demorou demais para responder. Tente novamente.', 504)
    }
    throw createHttpError('Não foi possível conectar ao openrouteservice.', 502)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = data?.error?.code
    const message = ORS_ERROR_MESSAGES[code] || data?.error?.message || data?.message || `Falha no openrouteservice (${response.status}).`
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return data
}

// Camadas do geocodificador que indicam só a cidade (ou algo maior), e não a rua.
const CITY_LEVEL_LAYERS = new Set(['locality', 'localadmin', 'county', 'macrocounty', 'region', 'macroregion', 'country'])

async function geocodeStructured(fields) {
  const params = new URLSearchParams({ ...fields, country: 'BR', size: '1' })
  for (const [key, value] of [...params]) if (!value) params.delete(key)
  const result = await orsRequest(`${ORS_GEOCODE_URL}/search/structured?${params}`)
  return result.features?.[0] || null
}

async function geocode(place) {
  let feature = await geocodeStructured({ address: place.address, locality: place.locality, region: place.region })

  // Rua desconhecida pelo geocodificador: em vez do centro da cidade, usa o centro do bairro.
  if (place.neighbourhood && (!feature || CITY_LEVEL_LAYERS.has(feature.properties?.layer))) {
    const byNeighbourhood = await geocodeStructured({ neighbourhood: place.neighbourhood, locality: place.locality, region: place.region })
    if (byNeighbourhood && !CITY_LEVEL_LAYERS.has(byNeighbourhood.properties?.layer)) {
      feature = { ...byNeighbourhood, properties: { ...byNeighbourhood.properties, match_type: 'fallback' } }
    }
  }

  if (!feature) {
    const location = [place.address, place.locality, place.region].filter(Boolean).join(', ')
    const error = new Error(`Endereço não encontrado: ${location}`)
    error.status = 404
    throw error
  }
  return {
    label: feature.properties?.label || place.address,
    coordinates: feature.geometry.coordinates,
    precise: feature.properties?.match_type === 'exact',
  }
}

// Respostas do openrouteservice guardadas em arquivo: localizar um endereço com rua leva ~5s, e os
// endereços e a rota entre eles quase não mudam (o serviço não usa trânsito em tempo real).
// Fica fora do projeto porque o Apache serviria o arquivo, que tem endereços de usuários.
const ORS_CACHE_FILE = path.join(os.tmpdir(), 'ecoleta-ors-cache.json')
const GEOCODE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const ROUTE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const orsCache = loadOrsCache()
const pendingOrsRequests = new Map()

function loadOrsCache() {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(ORS_CACHE_FILE, 'utf8'))))
  } catch {
    return new Map()
  }
}

function saveOrsCache() {
  for (const [key, entry] of orsCache) {
    if (Date.now() - entry.savedAt > GEOCODE_CACHE_MAX_AGE_MS) orsCache.delete(key)
  }
  try {
    fs.writeFileSync(ORS_CACHE_FILE, JSON.stringify(Object.fromEntries(orsCache)), { mode: 0o600 })
  } catch (error) {
    console.warn(`Não foi possível salvar o cache do openrouteservice: ${error.message}`)
  }
}

function cachedOrsRequest(key, maxAgeMs, request) {
  const cached = orsCache.get(key)
  if (cached && Date.now() - cached.savedAt < maxAgeMs) return Promise.resolve(cached.result)

  // Pedidos simultâneos iguais esperam a mesma consulta.
  if (!pendingOrsRequests.has(key)) {
    pendingOrsRequests.set(key, request()
      .then((result) => {
        orsCache.set(key, { result, savedAt: Date.now() })
        saveOrsCache()
        return result
      })
      .finally(() => pendingOrsRequests.delete(key)))
  }
  return pendingOrsRequests.get(key)
}

function geocodeCached(place) {
  const key = JSON.stringify([place.address, place.neighbourhood, place.locality, place.region].map((value) => value.toLowerCase()))
  return cachedOrsRequest(key, GEOCODE_CACHE_MAX_AGE_MS, () => geocode(place))
}

async function fetchTruckRoute(start, end, restrictions) {
  const route = await orsRequest(`${ORS_DIRECTIONS_URL}/driving-hgv/geojson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/geo+json' },
    body: JSON.stringify({
      coordinates: [start, end],
      language: 'pt',
      instructions: true,
      units: 'km',
      elevation: false,
      options: {
        vehicle_type: 'hgv',
        profile_params: { restrictions },
      },
    }),
  })
  if (!route?.features?.[0]) {
    throw createHttpError('O openrouteservice retornou uma rota inválida.', 502)
  }
  return route
}

function truckRouteCached(start, end, restrictions) {
  const key = `route:${JSON.stringify([start, end, restrictions])}`
  return cachedOrsRequest(key, ROUTE_CACHE_MAX_AGE_MS, () => fetchTruckRoute(start, end, restrictions))
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, apiKeyConfigured: Boolean(apiKey) })
})

// Dados da rota do usuário logado, montados pelo dados_usuario.php a partir do cadastro.
async function fetchUsuario(userId) {
  const url = new URL(USER_API_URL)
  url.searchParams.set('id', String(userId))
  let userResponse
  try {
    userResponse = await fetch(url, {
      signal: AbortSignal.timeout(USER_API_TIMEOUT_MS),
      headers: { Accept: 'application/json', 'X-Api-Token': INTERNAL_API_TOKEN },
      cache: 'no-store',
    })
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw createHttpError('A API de usuários demorou demais para responder.', 504)
    }
    throw createHttpError(`Não foi possível conectar à API de usuários (${USER_API_URL}).`, 502)
  }

  const data = await userResponse.json().catch(() => null)
  if (userResponse.status === 403) {
    console.error('dados_usuario.php recusou o token: confira INTERNAL_API_TOKEN no .env e api/config.php.')
    throw createHttpError('O servidor não está autorizado a consultar a API de usuários.', 502)
  }
  if (!userResponse.ok || !data) {
    // Erros do cadastro (ex.: usuário sem CEP) chegam com a mensagem do PHP para a pessoa ver.
    const status = userResponse.status >= 400 && userResponse.status < 500 ? userResponse.status : 502
    throw createHttpError(data?.mensagem || `A API de usuários respondeu com erro (${userResponse.status}).`, status)
  }
  return data
}

// Cada conexão guarda o usuário logado e a última mensagem enviada, para só mandar o que mudou.
const userStreamClients = new Map()

function streamMessage(event, payload) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

async function publishUsuario(userId) {
  let message
  try {
    message = streamMessage('usuario', await fetchUsuario(userId))
  } catch (error) {
    if ((error.status || 500) >= 500) console.error(error)
    message = streamMessage('erro', { error: error.message })
  }
  for (const [client, state] of userStreamClients) {
    if (state.userId !== userId || state.lastMessage === message || client.writableEnded || client.destroyed) continue
    state.lastMessage = message
    client.write(message)
  }
}

function publishToConnectedUsers() {
  const userIds = new Set([...userStreamClients.values()].map((state) => state.userId))
  for (const userId of userIds) publishUsuario(userId)
}

let userFileTimers = []
function watchUserApiFile() {
  const directory = path.dirname(USER_API_FILE)
  const fileName = path.basename(USER_API_FILE)
  try {
    // Observa a pasta, porque editores costumam salvar trocando o arquivo inteiro.
    fs.watch(directory, (_eventType, changedFile) => {
      if (changedFile && changedFile !== fileName) return
      for (const timer of userFileTimers) clearTimeout(timer)
      userFileTimers = USER_FILE_REFETCH_DELAYS_MS.map((delay) => setTimeout(publishToConnectedUsers, delay))
    })
    console.log(`Observando alterações em ${USER_API_FILE}`)
  } catch (error) {
    console.warn(`Não foi possível observar ${USER_API_FILE}: ${error.message}`)
  }
}

app.get('/api/usuario', auth.requireSession, async (request, response, next) => {
  try {
    response.set('Cache-Control', 'no-store').json(await fetchUsuario(request.usuario.id))
  } catch (error) {
    next(error)
  }
})

app.get('/api/usuario/stream', auth.requireSession, (request, response) => {
  response.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  response.flushHeaders()
  response.write('retry: 3000\n\n')
  userStreamClients.set(response, { userId: request.usuario.id, lastMessage: null })

  const heartbeat = setInterval(() => response.write(': ping\n\n'), USER_STREAM_HEARTBEAT_MS)
  request.on('close', () => {
    clearInterval(heartbeat)
    userStreamClients.delete(response)
  })

  publishUsuario(request.usuario.id)
})

app.post('/api/route', auth.requireSession, async (request, response, next) => {
  try {
    const { origin, destination, vehicle = {} } = request.body || {}
    const originPlace = parseAddress(origin, 'origem')
    const destinationPlace = parseAddress(destination, 'destino')

    const restrictions = parseVehicle(vehicle)
    assertApiKey()
    const [start, end] = await Promise.all([geocodeCached(originPlace), geocodeCached(destinationPlace)])
    const route = await truckRouteCached(start.coordinates, end.coordinates, restrictions)

    response.json({ start, end, route, restrictions })
  } catch (error) {
    next(error)
  }
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Rota não encontrada.' })
})

app.use((error, _request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }
  if (error.type === 'entity.parse.failed') {
    error.status = 400
    error.message = 'JSON inválido.'
  } else if (error.type === 'entity.too.large') {
    error.status = 413
    error.message = 'Requisição grande demais.'
  }
  const status = error.status || 500
  if (status >= 500) console.error(error)
  response.status(status).json({ error: status >= 500 && !error.status ? 'Erro interno.' : error.message || 'Erro interno.' })
})

const distDirectory = path.resolve(currentDirectory, '..', 'dist')
app.use(express.static(distDirectory))
app.get('*path', (_request, response) => response.sendFile(path.join(distDirectory, 'index.html')))

app.listen(port, (error) => {
  if (error) {
    console.error(`Não foi possível iniciar o servidor na porta ${port}: ${error.message}`)
    process.exitCode = 1
    return
  }
  console.log(`Servidor disponível em http://localhost:${port}`)
  console.log(`API PHP em ${API_BASE_URL} (configuração: ${ENV_FILE})`)
  watchUserApiFile()
})
