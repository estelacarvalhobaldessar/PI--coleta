import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 8787)
const apiKey = process.env.ORS_API_KEY?.trim()
const ORS_BASE_URL = 'https://api.openrouteservice.org'
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

function assertApiKey() {
  if (!apiKey) {
    const error = new Error('Configure ORS_API_KEY no arquivo .env antes de calcular a rota.')
    error.status = 500
    throw error
  }
}

function createHttpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

function parsePositiveNumber(value, fallback, label) {
  const parsed = value === undefined || value === '' ? fallback : Number(value)
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
  if (!address || !locality) {
    throw createHttpError(`Informe rua/número e cidade para ${label}.`, 400)
  }
  if (address.length > 200 || locality.length > 120 || region.length > 60) {
    throw createHttpError(`Endereço de ${label} excede o tamanho máximo permitido.`, 400)
  }
  return { address, locality, region }
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

async function geocode(place) {
  const params = new URLSearchParams({
    address: place.address,
    locality: place.locality,
    country: 'BR',
    size: '1',
  })
  if (place.region) params.set('region', place.region)
  const result = await orsRequest(`${ORS_BASE_URL}/geocode/search/structured?${params}`)
  const feature = result.features?.[0]
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

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, apiKeyConfigured: Boolean(apiKey) })
})

app.post('/api/route', async (request, response, next) => {
  try {
    const { origin, destination, vehicle = {} } = request.body || {}
    const originPlace = parseAddress(origin, 'origem')
    const destinationPlace = parseAddress(destination, 'destino')

    const restrictions = parseVehicle(vehicle)
    const [start, end] = await Promise.all([geocode(originPlace), geocode(destinationPlace)])

    const route = await orsRequest(`${ORS_BASE_URL}/v2/directions/driving-hgv/geojson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/geo+json' },
      body: JSON.stringify({
        coordinates: [start.coordinates, end.coordinates],
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

    response.json({ start, end, route, restrictions })
  } catch (error) {
    next(error)
  }
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(error.status || 500).json({ error: error.message || 'Erro interno.' })
})

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
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
})
