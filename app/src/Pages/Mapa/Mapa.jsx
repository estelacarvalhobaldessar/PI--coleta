/* eslint-disable react-hooks/set-state-in-effect */
import Sidebar from '../../sidebar'
import Perfil from '../../MeuPerfil'
import MudarLocal from './MudarLocal'
import ColSeletiva from './ColSeletiva'
import Configuracoes from './Configuracoes'
import './Mapa.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import caminhaoUrl from '../../assets/caminhao.png'
import lixeiraUrl from '../../assets/lixeira.svg'
import folhasUrl from '../../assets/folhas.svg'
import { apiFetch } from '../../api'
import { ROUTE_CACHE_MAX_AGE_MS, readCachedRoute, saveCachedRoute } from './routeCache'

// O servidor Express busca no api/dados_usuario.php o endereço do usuário logado e envia
// por este canal; quando o arquivo é salvo (ex.: novo endereço do caminhão), envia de novo.
const USER_STREAM_URL = '/api/usuario/stream'

const TRUCK_ICON = L.divIcon({
  html: `<img class="truck-marker" src="${caminhaoUrl}" alt="" />`,
  className: 'truck-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 30],
})

const BIN_ICON = L.divIcon({
  html: `<img class="bin-marker" src="${lixeiraUrl}" alt="" />`,
  className: 'bin-icon',
  iconSize: [30, 34],
  iconAnchor: [15, 32],
  popupAnchor: [0, -30],
})

const ROUTE_STYLE = { color: '#1a1a1a', weight: 3, opacity: 0.9, dashArray: '6 8', lineCap: 'round' }
const CLOCK_TICK_MS = 5_000
const STREAM_RETRY_MS = 1_000
const FOLLOW_TRUCK_ZOOM = 17

function createRouteRequest(usuario) {
  return {
    origin: { address: usuario.caminhao.logradouro, neighbourhood: usuario.caminhao.bairro || '', locality: usuario.caminhao.cidade, region: usuario.caminhao.uf },
    destination: { address: usuario.endereco.logradouro, neighbourhood: usuario.endereco.bairro || '', locality: usuario.endereco.cidade, region: usuario.endereco.uf },
    height: 3.0,
    width: 3.7,
    length: 10.0,
    weight: 12,
    axleload: 6,
    hazmat: false,
  }
}
function fitRoute(map, route) {
  const bounds = L.geoJSON(route).getBounds()
  if (!bounds.isValid()) return
  // Margem menor em telas estreitas; espaço extra embaixo para a bola do painel não cobrir a rota.
  const padding = map.getSize().x < 600 ? 28 : 56
  map.fitBounds(bounds, { paddingTopLeft: [padding, padding], paddingBottomRight: [padding, padding + 56], maxZoom: 17 })
}

function RouteViewport({ route }) {
  const map = useMap()
  useEffect(() => {
    if (route) fitRoute(map, route)
  }, [map, route])
  return null
}

// Durante o acompanhamento, zoom pela roda do mouse ou pinça mantém o caminhão no centro.
function setCenteredZoom(map, centered) {
  map.options.scrollWheelZoom = centered ? 'center' : true
  map.options.touchZoom = centered ? 'center' : true
}

function ControlIcon({ name }) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    target: 'M12 2v4M12 18v4M2 12h4M18 12h4',
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === 'target' && <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />}
      {name === 'target' && <circle cx="12" cy="12" r="2.2" fill="currentColor" />}
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function MapControls({ route, truckPositionRef, following, onFollowingChange }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const containerRef = useRef(null)

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    // Arrastar o mapa encerra o acompanhamento para a pessoa explorar à vontade.
    dragstart: () => onFollowingChange(false),
  })

  // Cliques nos botões não devem arrastar nem dar zoom no mapa.
  useEffect(() => {
    if (!containerRef.current) return
    L.DomEvent.disableClickPropagation(containerRef.current)
    L.DomEvent.disableScrollPropagation(containerRef.current)
  }, [])

  useEffect(() => {
    if (!following) return undefined
    let frame
    let ready = false
    let zooming = false
    const onZoomStart = () => { zooming = true }
    const onZoomEnd = () => { zooming = false }
    const onArrived = () => { ready = true }

    setCenteredZoom(map, true)
    map.on('zoomstart', onZoomStart)
    map.on('zoomend', onZoomEnd)
    const start = truckPositionRef.current
    if (start) {
      map.once('moveend', onArrived)
      map.flyTo(start, FOLLOW_TRUCK_ZOOM, { duration: 0.6 })
    } else {
      ready = true
    }

    function step() {
      const position = truckPositionRef.current
      if (ready && !zooming && position) map.setView(position, map.getZoom(), { animate: false })
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frame)
      map.off('zoomstart', onZoomStart)
      map.off('zoomend', onZoomEnd)
      map.off('moveend', onArrived)
      setCenteredZoom(map, false)
    }
  }, [following, map, truckPositionRef])

  function toggleFollowing() {
    if (following) {
      onFollowingChange(false)
      if (route) fitRoute(map, route)
    } else {
      onFollowingChange(true)
    }
  }

  return (
    <div ref={containerRef} className='mapa-controles' role='group' aria-label='Controles do mapa'>
      <button type='button' className='mapa-controle' onClick={() => map.zoomIn()} disabled={zoom >= map.getMaxZoom()} aria-label='Aproximar' title='Aproximar'>
        <ControlIcon name='plus' />
      </button>
      <button type='button' className='mapa-controle' onClick={() => map.zoomOut()} disabled={zoom <= map.getMinZoom()} aria-label='Afastar' title='Afastar'>
        <ControlIcon name='minus' />
      </button>
      <button
        type='button'
        className='mapa-controle mapa-controle-seguir'
        onClick={toggleFollowing}
        disabled={!route}
        aria-pressed={following}
        aria-label={following ? 'Parar de acompanhar o caminhão e ver a rota inteira' : 'Centralizar e acompanhar o caminhão'}
        title={following ? 'Ver rota inteira' : 'Acompanhar o caminhão'}
      >
        <ControlIcon name='target' />
      </button>
    </div>
  )
}

function TruckMarker({ route, speed, startedAt, positionRef }) {
  const [position, setPosition] = useState(null)
  const frameRef = useRef()

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
    if (totalDistance === 0) {
      positionRef.current = latlngs[0]
      setPosition(latlngs[0])
      return undefined
    }
    function step() {
      const progress = (Math.max(0, Date.now() - startedAt) * speed / baseDurationMs) % 1
      const targetDistance = progress * totalDistance

      let index = cumulative.findIndex((value) => value >= targetDistance)
      if (index <= 0) index = 1

      const segmentStart = cumulative[index - 1]
      const segmentEnd = cumulative[index]
      const segmentProgress = segmentEnd > segmentStart ? (targetDistance - segmentStart) / (segmentEnd - segmentStart) : 0

      const from = latlngs[index - 1]
      const to = latlngs[index]
      const current = L.latLng(
        from.lat + (to.lat - from.lat) * segmentProgress,
        from.lng + (to.lng - from.lng) * segmentProgress,
      )
      positionRef.current = current
      setPosition(current)

      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [latlngs, baseDurationMs, speed, startedAt, positionRef])

  if (!position) return null
  return <Marker position={position} icon={TRUCK_ICON} interactive={false} />
}

function formatDuration(seconds = 0) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}min`
}

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDistance(km = 0) {
  return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

function Chevron({ direction }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Mapa({ usuarioId, usuarioSessao, onSair, onSessaoExpirada }) {
  const [pagina, setPagina] = useState('mapa')
  const [paginaAnterior, setPaginaAnterior] = useState('mapa')
  const [routeState, setRouteState] = useState(() => readCachedRoute(usuarioId))
  const [streamAttempt, setStreamAttempt] = useState(0)
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userError, setUserError] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [followingTruck, setFollowingTruck] = useState(false)
  const truckPositionRef = useRef(null)
  const requestedSignature = useRef(null)

  const result = routeState?.result
  const summary = result?.route?.features?.[0]?.properties?.summary
  const displayError = error || userError
  const mapCenter = useMemo(() => [-30.0218, -51.2117], [])

  const statusText = !usuario ? (userError ? 'Rota indisponível' : 'Carregando dados…') : loading ? 'Calculando rota…' : 'Rota indisponível'
  const slides = [
    { label: 'Horário previsto de chegada', value: summary ? formatClock(now + summary.duration * 1000) : '--:--' },
    { label: 'Distância até você', value: summary ? formatDistance(summary.distance) : '--' },
    { label: 'Tempo estimado', value: summary ? formatDuration(summary.duration) : '--' },
  ]
  const currentSlide = slides[slideIndex]
  const changeSlide = (step) => setSlideIndex((index) => (index + step + slides.length) % slides.length)
  const mudarPagina = (novaPagina) => {
    if (novaPagina === 'configuracoes') setPaginaAnterior(pagina)
    setPagina(novaPagina)
  }

  // Atualiza o horário previsto conforme o relógio avança.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let source
    let retryTimer
    let stopped = false

    function handleUsuario(event) {
      let data
      try {
        data = JSON.parse(event.data)
      } catch {
        data = null
      }
      if (!data?.endereco?.logradouro || !data?.caminhao?.logradouro) {
        setUserError('A API retornou dados de usuário inválidos.')
        return
      }
      // Mantém o objeto anterior quando nada mudou, para não disparar novos cálculos de rota.
      setUsuario((previous) => (JSON.stringify(previous) === JSON.stringify(data) ? previous : data))
      setUserError('')
    }

    function handleErro(event) {
      let message
      try {
        message = JSON.parse(event.data).error
      } catch {
        message = null
      }
      setUserError(message || 'Erro ao carregar os dados do usuário.')
    }

    // O navegador só reconecta sozinho quando a conexão cai no meio. Se o servidor recusar
    // (sessão expirada) ou estiver fora do ar, a conexão fecha de vez e decidimos aqui.
    async function handleClosed() {
      setUserError('Conexão com o servidor perdida. Reconectando…')
      const sessao = await apiFetch('/api/sessao').catch(() => null)
      if (stopped) return
      if (sessao?.status === 401) {
        onSessaoExpirada()
        return
      }
      retryTimer = setTimeout(connect, STREAM_RETRY_MS)
    }

    function connect() {
      if (stopped) return
      source = new EventSource(USER_STREAM_URL)
      source.addEventListener('usuario', handleUsuario)
      source.addEventListener('erro', handleErro)
      source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) handleClosed()
        else setUserError('Conexão com o servidor perdida. Reconectando…')
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(retryTimer)
      source?.close()
    }
  }, [onSessaoExpirada, streamAttempt])

  const calculateRoute = useCallback(async (dadosUsuario) => {
    const routeRequest = createRouteRequest(dadosUsuario)
    const routeSignature = JSON.stringify(routeRequest)
    setLoading(true)
    setError('')
    try {
        const response = await fetch('/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin: routeRequest.origin,
                destination: routeRequest.destination,
                vehicle: {
                    height: routeRequest.height,
                    width: routeRequest.width,
                    length: routeRequest.length,
                    weight: routeRequest.weight,
                    axleload: routeRequest.axleload,
                    hazmat: routeRequest.hazmat,
                },
            }),
        })

        if (response.status === 401) {
            onSessaoExpirada()
            return
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Erro ao calcular a rota.')
        }

        const data = await response.json()
        if (!data.route?.features?.[0]) {
            throw new Error('O serviço retornou uma rota inválida.')
        }

        const now = Date.now()
        const cached = { request: routeSignature, result: data, startedAt: now, savedAt: now }
        setRouteState(cached)
        saveCachedRoute(usuarioId, cached)
    } catch (routeError) {
        setError(routeError.message || 'Erro desconhecido.')
    } finally {
        setLoading(false)
    }
}, [onSessaoExpirada, usuarioId])

  useEffect(() => {
    if (!usuario) return
    const routeSignature = JSON.stringify(createRouteRequest(usuario))
    if (requestedSignature.current === routeSignature) return
    requestedSignature.current = routeSignature
    if (routeState?.request !== routeSignature || Date.now() - routeState.savedAt > ROUTE_CACHE_MAX_AGE_MS) calculateRoute(usuario)
  }, [calculateRoute, routeState, usuario])

  // Renderizar páginas diferentes baseado no estado 'pagina'
  if (pagina !== 'mapa') {
    return (
      <div className={`app app-pagina${pagina === 'perfil' || pagina === 'configuracoes' ? ' app-perfil' : ''}`}>
        <header className={`topo${pagina === 'perfil' || pagina === 'configuracoes' ? ' topo-perfil' : ''}`}>
          <a className='marca' href='#home' aria-label='Ecoleta, voltar ao mapa' onClick={(event) => { event.preventDefault(); setPagina('mapa') }}>
            <img className='marca-icone' src={caminhaoUrl} alt='' />
            <span className='marca-nome'>ÉCOLETA</span>
          </a>
          <Sidebar onSair={onSair} onMudarPagina={mudarPagina} />
        </header>

        {pagina === 'mudarlocal' && <MudarLocal onVoltar={() => setPagina('mapa')} />}
        {pagina === 'colseletiva' && <ColSeletiva onVoltar={() => setPagina('mapa')} />}
        {pagina === 'configuracoes' && <Configuracoes onVoltar={() => setPagina(paginaAnterior)} onAbrirPerfil={() => setPagina('perfil')} />}
        {pagina === 'perfil' && (
          <Perfil
            usuario={usuarioSessao}
            endereco={usuario?.endereco}
            onAbrirConfiguracoes={() => mudarPagina('configuracoes')}
          />
        )}
      </div>
    )
  }

  // Renderizar página de mapa padrão
  return (
    <div className='app'>
      <header className='topo'>
        <a className='marca' href='#home' aria-label='Ecoleta, página inicial'>
          <img className='marca-icone' src={caminhaoUrl} alt='' />
          <span className='marca-nome'>ÉCOLETA</span>
        </a>
        <Sidebar onSair={onSair} onMudarPagina={mudarPagina} />
      </header>

      <main className='mapa-area' aria-label='Mapa da rota do caminhão'>
        <MapContainer center={mapCenter} zoom={14} zoomSnap={0.25} zoomControl={false} className='map'>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            maxZoom={19}
          />
          {result?.route && <GeoJSON key={JSON.stringify(result.route.bbox)} data={result.route} style={ROUTE_STYLE} />}
          {result?.end && (
            <Marker position={[result.end.coordinates[1], result.end.coordinates[0]]} icon={BIN_ICON}>
              <Popup>
                <strong>Ponto de coleta</strong><br />{result.end.label}
                {!result.end.precise && <><br /><small>Localização aproximada</small></>}
              </Popup>
            </Marker>
          )}
          {result?.route && <TruckMarker key={`truck-${JSON.stringify(result.route.bbox)}`} route={result.route} speed={0.5} startedAt={routeState.startedAt} positionRef={truckPositionRef} />}
          <RouteViewport route={result?.route} />
          <MapControls route={result?.route} truckPositionRef={truckPositionRef} following={followingTruck} onFollowingChange={setFollowingTruck} />
        </MapContainer>

        {displayError && (
          <div className='aviso' role='alert'>
            <span>{displayError}{result && ' Mostrando a última rota salva.'}</span>
            {error && usuario && <button className='aviso-botao' type='button' onClick={() => calculateRoute(usuario)}>Tentar novamente</button>}
            {!error && userError && <button className='aviso-botao' type='button' onClick={() => setStreamAttempt((attempt) => attempt + 1)}>Tentar novamente</button>}
          </div>
        )}
      </main>

      <footer className='painel'>
        <img className='painel-folhas painel-folhas-esq' src={folhasUrl} alt='' aria-hidden='true' />
        <img className='painel-folhas painel-folhas-dir' src={folhasUrl} alt='' aria-hidden='true' />

        <div className='painel-bola' aria-hidden='true'>
          <img src={caminhaoUrl} alt='' />
        </div>

        {/* Celular e tablet: um dado por vez, trocado pelas setas */}
        <div className='painel-carrossel'>
          <button className='painel-seta' type='button' onClick={() => changeSlide(-1)} aria-label='Informação anterior'>
            <Chevron direction='left' />
          </button>
          <div className='painel-info' aria-live='polite' key={slideIndex}>
            <span className='painel-rotulo'>{summary ? currentSlide.label : statusText}</span>
            <strong className='painel-valor'>{currentSlide.value}</strong>
          </div>
          <button className='painel-seta' type='button' onClick={() => changeSlide(1)} aria-label='Próxima informação'>
            <Chevron direction='right' />
          </button>
        </div>

        {/* Desktop e monitores largos: os três dados lado a lado */}
        <dl className='painel-estatisticas'>
          {[slides[1], slides[0], slides[2]].map((slide, index) => (
            <div key={slide.label} className={index === 1 ? 'painel-info painel-info-principal' : 'painel-info'}>
              <dt className='painel-rotulo'>{index === 1 && !summary ? statusText : slide.label}</dt>
              <dd className='painel-valor'>{slide.value}</dd>
            </div>
          ))}
        </dl>
      </footer>
    </div>
  )
}

export default Mapa
