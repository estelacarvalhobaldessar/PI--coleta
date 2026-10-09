// A rota salva no navegador é separada por usuário, para ninguém ver a rota de outra pessoa.
const ROUTE_CACHE_PREFIX = 'ecoleta.route.v2.'
export const ROUTE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

export function clearRouteCache() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(ROUTE_CACHE_PREFIX) || key === 'ecoleta.route.v1') localStorage.removeItem(key)
    }
  } catch {
    // Sem armazenamento local não há rota salva para apagar.
  }
}

export function readCachedRoute(userId) {
  try {
    const cached = JSON.parse(localStorage.getItem(ROUTE_CACHE_PREFIX + userId))
    if (!cached?.request || !cached.result?.route?.features?.[0] || !Number.isFinite(cached.startedAt) || !Number.isFinite(cached.savedAt)) return null
    return cached
  } catch {
    return null
  }
}

export function saveCachedRoute(userId, cached) {
  try {
    localStorage.setItem(ROUTE_CACHE_PREFIX + userId, JSON.stringify(cached))
  } catch {
    // A rota continua disponível nesta página mesmo se o armazenamento estiver cheio.
  }
}
