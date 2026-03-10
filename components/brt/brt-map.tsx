"use client"

import { useEffect, useRef, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Veiculo } from "@/lib/types"
import { estimarChegada, formatDistancia } from "@/lib/geo-utils"
import {
  getCorredorFromTrajeto,
  getEstacaoMaisProxima,
  corredores,
} from "@/lib/brt-stations"

interface BRTMapProps {
  veiculos: Veiculo[]
  selectedId: string | null
  onSelectVeiculo: (id: string) => void
  userLocation: { lat: number; lng: number } | null
}

function createBusIcon(isMoving: boolean, isSelected: boolean) {
  const size = isSelected ? 36 : 28
  const bgColor = isSelected ? "#4f46e5" : isMoving ? "#059669" : "#d97706"
  const pulseClass = isMoving && !isSelected ? "bus-pulse" : ""
  const ring = isSelected ? `box-shadow: 0 0 0 4px rgba(79,70,229,0.35), 0 2px 8px rgba(0,0,0,0.3);` : `box-shadow: 0 2px 8px rgba(0,0,0,0.25);`

  return L.divIcon({
    className: "bus-marker-icon",
    html: `<div class="${pulseClass}" style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${bgColor};
      ${ring}
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      border: 2px solid rgba(255,255,255,0.9);
    ">
      <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="14" rx="2" stroke="white" stroke-width="2"/>
        <rect x="4" y="12" width="16" height="5" rx="0" stroke="white" stroke-width="2"/>
        <line x1="4" y1="9" x2="20" y2="9" stroke="white" stroke-width="1.5"/>
        <circle cx="8" cy="19" r="1.5" fill="white"/>
        <circle cx="16" cy="19" r="1.5" fill="white"/>
        <rect x="7" y="5" width="4" height="3" rx="0.5" fill="rgba(255,255,255,0.4)"/>
        <rect x="13" y="5" width="4" height="3" rx="0.5" fill="rgba(255,255,255,0.4)"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function createUserIcon() {
  return L.divIcon({
    className: "user-marker-icon",
    html: `<div class="user-loc-pulse" style="
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid white;
      box-shadow: 0 0 0 6px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function createPopupContent(
  v: Veiculo,
  userLoc: { lat: number; lng: number } | null
) {
  const vel = Number(v.velocidade) || 0
  const isMoving = vel > 0
  const busLat = Number(v.latitude)
  const busLng = Number(v.longitude)
  const statusColor = isMoving ? "#059669" : "#d97706"
  const statusBg = isMoving ? "#ecfdf5" : "#fffbeb"
  const statusText = isMoving ? "Em movimento" : "Parado"

  // ETA
  let etaHtml = ""
  if (userLoc && !isNaN(busLat) && !isNaN(busLng)) {
    const eta = estimarChegada(busLat, busLng, vel, userLoc.lat, userLoc.lng)
    etaHtml = `
      <div style="margin-top: 10px; padding: 10px; background: linear-gradient(135deg, #ecfdf5, #f0fdf4); border: 1px solid #bbf7d0; border-radius: 8px;">
        <div style="font-size: 10px; color: #059669; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Previsao ate voce</div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span style="font-size: 22px; font-weight: 800; color: #047857; font-family: 'Geist Mono', monospace;">${eta.texto}</span>
          <span style="font-size: 11px; color: #6b7280; font-weight: 500;">${formatDistancia(eta.distanciaKm)}</span>
        </div>
        <div style="font-size: 10px; color: #9ca3af; margin-top: 3px;">${vel > 5 ? "Baseado na velocidade atual" : "Estimativa (vel. media ~25 km/h)"}</div>
      </div>
    `
  }

  // Estacao mais proxima
  let stationHtml = ""
  const corredorKey = v.trajeto
  ? getCorredorFromTrajeto(v.trajeto)
  : undefined
  if (corredorKey && corredores[corredorKey] && !isNaN(busLat) && !isNaN(busLng)) {
    const { estacao, distKm } = getEstacaoMaisProxima(busLat, busLng, corredores[corredorKey])
    stationHtml = `
      <div style="margin-top: 8px; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${corredores[corredorKey].cor}; flex-shrink: 0;"></div>
        <div>
          <div style="font-size: 10px; color: #94a3b8; font-weight: 600;">Proxima estacao</div>
          <div style="font-size: 12px; color: #334155; font-weight: 600;">${estacao.nome}</div>
          <div style="font-size: 10px; color: #94a3b8;">${formatDistancia(distKm)} - ${corredores[corredorKey].nome}</div>
        </div>
      </div>
    `
  }

  return `
    <div style="font-family: 'Geist', system-ui, sans-serif; min-width: 230px; padding: 2px 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #1e293b; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="14" rx="2" stroke="white" stroke-width="2"/><line x1="4" y1="9" x2="20" y2="9" stroke="white" stroke-width="1.5"/><circle cx="8" cy="19" r="1.5" fill="white"/><circle cx="16" cy="19" r="1.5" fill="white"/></svg>
          </div>
          <div>
            <strong style="font-size: 15px; font-family: 'Geist Mono', monospace; color: #0f172a;">${v.veiculo || "N/A"}</strong>
            <div style="font-size: 11px; color: #64748b;">Linha ${v.linha || "?"}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; background: ${statusBg}; padding: 3px 8px; border-radius: 20px;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${statusColor};"></div>
          <span style="font-size: 10px; color: ${statusColor}; font-weight: 600;">${statusText}</span>
        </div>
      </div>
      <div style="display: grid; gap: 6px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;"><span style="color: #94a3b8;">Velocidade</span> <span style="color: #0f172a; font-weight: 600; font-family: 'Geist Mono', monospace;">${vel} km/h</span></div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;"><span style="color: #94a3b8;">Sentido</span> <span style="color: #0f172a; font-weight: 500;">${v.sentido || "N/A"}</span></div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;"><span style="color: #94a3b8;">Trajeto</span> <span style="color: #0f172a; font-weight: 500; text-align: right; max-width: 160px; font-size: 11px;">${v.trajeto || "N/A"}</span></div>
        ${v.placa ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px solid #f1f5f9;"><span style="color: #94a3b8;">Placa</span> <span style="color: #0f172a; font-weight: 600; font-family: 'Geist Mono', monospace;">${v.placa}</span></div>` : ""}
      </div>
      ${stationHtml}
      ${etaHtml}
    </div>
  `
}

export function BRTMap({
  veiculos,
  selectedId,
  onSelectVeiculo,
  userLocation,
}: BRTMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const userMarkerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelectVeiculo)
  const userLocRef = useRef(userLocation)

  useEffect(() => {
    onSelectRef.current = onSelectVeiculo
  }, [onSelectVeiculo])

  useEffect(() => {
    userLocRef.current = userLocation
  }, [userLocation])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-22.9064, -43.1761],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = {}
    }
  }, [])

  // User location marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
      } else {
        userMarkerRef.current = L.marker(
          [userLocation.lat, userLocation.lng],
          { icon: createUserIcon(), zIndexOffset: 1000 }
        )
          .bindPopup(
            `<div style="font-family: 'Geist', system-ui, sans-serif; padding: 4px; text-align: center;">
              <strong style="color: #3b82f6; font-size: 13px;">Voce esta aqui</strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</div>
            </div>`
          )
          .addTo(map)
      }
    } else if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }
  }, [userLocation])

  // Update markers
  const updateMarkers = useCallback(
    (veiculos: Veiculo[], selectedId: string | null) => {
      const map = mapRef.current
      if (!map) return

      const currentIds = new Set<string>()

      veiculos.forEach((v) => {
        const id = v.id || v.veiculo || ""
        if (!id) return

        currentIds.add(id)
        const lat = Number(v.latitude)
        const lng = Number(v.longitude)

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

        const isMoving = (Number(v.velocidade) || 0) > 0
        const isSelected = selectedId === id

        if (markersRef.current[id]) {
          markersRef.current[id].setLatLng([lat, lng])
          markersRef.current[id].setIcon(createBusIcon(isMoving, isSelected))
          const popup = markersRef.current[id].getPopup()
          if (popup) {
            popup.setContent(createPopupContent(v, userLocRef.current))
          }
        } else {
          const marker = L.marker([lat, lng], {
            icon: createBusIcon(isMoving, isSelected),
          })
            .bindPopup(createPopupContent(v, userLocRef.current), {
              maxWidth: 280,
              className: "brt-popup",
            })
            .addTo(map)

          marker.on("click", () => {
            onSelectRef.current(id)
          })

          markersRef.current[id] = marker
        }
      })

      for (const id in markersRef.current) {
        if (!currentIds.has(id)) {
          map.removeLayer(markersRef.current[id])
          delete markersRef.current[id]
        }
      }
    },
    []
  )

  useEffect(() => {
    updateMarkers(veiculos, selectedId)
  }, [veiculos, selectedId, updateMarkers])

  // Fly to selected vehicle
  useEffect(() => {
    if (selectedId && markersRef.current[selectedId] && mapRef.current) {
      const marker = markersRef.current[selectedId]
      mapRef.current.flyTo(marker.getLatLng(), 15, { duration: 0.8 })
      marker.openPopup()
    }
  }, [selectedId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label="Mapa de veiculos BRT do Rio de Janeiro"
    />
  )
}
