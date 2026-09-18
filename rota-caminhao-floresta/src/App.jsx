import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import usuario from './usuario.json';

const TRUCK_ICON = L.divIcon({
  html: '<span class="truck-marker"></span>',
  className: 'truck-icon',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})






const DEFAULT_FORM = {
  origin: { address: usuario.endereco.logradouro, locality: usuario.endereco.cidade, region: usuario.endereco.uf },
  destination: { address: usuario.caminhao.logradouro, locality: usuario.caminhao.cidade, region: usuario.caminhao.uf },
  height: 3.0,
  width: 3.7,
  length: 10.0,
  weight: 12,
  axleload: 6,
  hazmat: false,
}

function RouteViewport({ route }) {
  const map = useMap()
  useEffect(() => {
    if (!route) return
    const layer = L.geoJSON(route)
    const bounds = layer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 })
  }, [map, route])
  return null
}

function TruckMarker({ route, speed }) {
  const [position, setPosition] = useState(null)
  const frameRef = useRef()
  const progressRef = useRef(0)
  const lastTimeRef = useRef(null)
  const speedRef = useRef(speed)
  speedRef.current = speed

  const latlngs = useMemo(() => {
    const coordinates = route?.features?.[0]?.geometry?.coordinates || []
    return coordinates.map(([lng, lat]) => L.latLng(lat, lng))
  }, [route])

  const distanceKm = route?.features?.[0]?.properties?.summary?.distance || 0
  const baseDurationMs = Math.max(8_000, distanceKm * 3000)

  useEffect(() => {
    if (latlngs.length < 2) {
      setPosition(null)
      return undefined
    }

    const cumulative = [0]
    for (let i = 1; i < latlngs.length; i += 1) {
      cumulative.push(cumulative[i - 1] + latlngs[i - 1].distanceTo(latlngs[i]))
    }
    const totalDistance = cumulative[cumulative.length - 1]
    progressRef.current = 0
    lastTimeRef.current = null

    function step(now) {
      if (lastTimeRef.current === null) lastTimeRef.current = now
      const deltaMs = now - lastTimeRef.current
      lastTimeRef.current = now

      const durationMs = baseDurationMs / speedRef.current
      progressRef.current = (progressRef.current + deltaMs / durationMs) % 1
      const targetDistance = progressRef.current * totalDistance

      let index = cumulative.findIndex((value) => value >= targetDistance)
      if (index <= 0) index = 1

      const segmentStart = cumulative[index - 1]
      const segmentEnd = cumulative[index]
      const segmentProgress = segmentEnd > segmentStart ? (targetDistance - segmentStart) / (segmentEnd - segmentStart) : 0

      const from = latlngs[index - 1]
      const to = latlngs[index]
      setPosition(L.latLng(
        from.lat + (to.lat - from.lat) * segmentProgress,
        from.lng + (to.lng - from.lng) * segmentProgress,
      ))

      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [latlngs, baseDurationMs])

  if (!position) return null
  return <Marker position={position} icon={TRUCK_ICON} interactive={false} />
}

function formatDuration(seconds = 0) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}min`
}

function App() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [truckSpeed, setTruckSpeed] = useState(0.50)
  const initialRouteRequested = useRef(false)

  const summary = result?.route?.features?.[0]?.properties?.summary
  const steps = result?.route?.features?.[0]?.properties?.segments?.[0]?.steps || []
  const mapCenter = useMemo(() => [-30.0218, -51.2117], [])
  const impreciseSides = result
    ? [!result.start?.precise && 'origem', !result.end?.precise && 'destino'].filter(Boolean)
    : []

  const updateField = ({ target }) => {
    const { name, type, checked, value } = target
    setForm((current) => {
      if (name.includes('.')) {
        const [group, field] = name.split('.')
        return { ...current, [group]: { ...current[group], [field]: value } }
      }
      return { ...current, [name]: type === 'checkbox' ? checked : value }
    })
  }

  const calculateRoute = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          vehicle: {
            height: form.height,
            width: form.width,
            length: form.length,
            weight: form.weight,
            axleload: form.axleload,
            hazmat: form.hazmat,
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Não foi possível calcular a rota.')
      if (!data.route?.features?.[0]) throw new Error('O serviço retornou uma rota inválida.')
      setResult(data)
    } catch (routeError) {
      setError(routeError.message)
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    if (initialRouteRequested.current) return
    initialRouteRequested.current = true
    calculateRoute()
  }, [calculateRoute])

  return (
    <main className="app-shell">
      

      <section className="map-panel" aria-label="Mapa da rota">
        <MapContainer center={mapCenter} zoom={14} zoomControl={false} className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {result?.route && <GeoJSON key={JSON.stringify(result.route.bbox)} data={result.route} style={{ color: '#152940', weight: 7, opacity: 0.92, lineCap: 'round' }} />}
          {result?.start && <CircleMarker center={[result.start.coordinates[1], result.start.coordinates[0]]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#1f8a70', fillOpacity: 1 }}><Popup><strong>Origem</strong><br />{result.start.label}</Popup></CircleMarker>}
          {result?.end && <CircleMarker center={[result.end.coordinates[1], result.end.coordinates[0]]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#1f8a70', fillOpacity: 1 }}><Popup><strong>Destino</strong><br />{result.end.label}</Popup></CircleMarker>}
          {result?.route && <TruckMarker key={`truck-${JSON.stringify(result.route.bbox)}`} route={result.route} speed={truckSpeed} />}
          <RouteViewport route={result?.route} />
        </MapContainer>
      </section>
    </main>
  )
}

export default App
