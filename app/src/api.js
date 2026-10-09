// Chamadas ao servidor Express (mesma origem). O cookie de sessão vai junto automaticamente.
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}
