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
  const size = isSelected ? 40 : 32
  const bgColor = isSelected 
    ? "#8b5cf6" 
    : isMoving 
      ? "#10b981" 
      : "#f59e0b"
  
  const pulseClass = isMoving && !isSelected ? "bus-pulse" : ""
  const ring = isSelected 
    ? `box-shadow: 0 0 0 4px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.5);` 
    : `box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.5);`

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
      border: 3px solid white;
      transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
    ">
      <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
        <rect x="4" y="3" width="16" height="14" rx="2" fill="white" fill-opacity="0.2"/>
        <rect x="6" y="6" width="4" height="3" rx="0.5" fill="white" fill-opacity="0.5"/>
        <rect x="14" y="6" width="4" height="3" rx="0.5" fill="white" fill-opacity="0.5"/>
        <circle cx="8" cy="19" r="2" fill="white"/>
        <circle cx="16" cy="19" r="2" fill="white"/>
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
      width: 24px; height: 24px;
      border-radius: 50%;
      background: #3b82f6;
      border: 4px solid white;
      box-shadow: 0 0 0 6px rgba(59,130,246,0.3), 0 8px 16px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
  const statusColor = isMoving ? "#10b981" : "#f59e0b"
  const statusBg = isMoving ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)"
  const statusText = isMoving ? "Em movimento" : "Parado"

  let etaHtml = ""
  if (userLoc && !isNaN(busLat) && !isNaN(busLng)) {
    const eta = estimarChegada(busLat, busLng, vel, userLoc.lat, userLoc.lng)
    etaHtml = `
      <div style="margin-top: 12px; padding: 12px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; color: white;">
        <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; opacity: 0.9;">Previsão de chegada</div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span style="font-size: 24px; font-weight: 800; font-family: 'Geist Mono', monospace;">${eta.texto}</span>
          <span style="font-size: 12px; font-weight: 500; opacity: 0.9;">${formatDistancia(eta.distanciaKm)}</span>
        </div>
        <div style="font-size: 10px; margin-top: 4px; opacity: 0.8;">${vel > 5 ? " Baseado na velocidade atual" : " Estimativa média"}</div>
      </div>
    `
  }

  let stationHtml = ""
  const corredorKey = getCorredorFromTrajeto(v.trajeto) // Se o veículo tiver um trajeto reconhecido, ele deve mostrar a estação mais próxima, mas no momento essa funçao eu tirei, pois vou precisar pegar as rotas precisas de todas estaçoes, e creio que vai levar um tempo pra eu fazer isso:/ mas breve eu irei atualizar isso, pois acho que vai ser uma informaçao bem interessante de se ter no popup, principalmente pra quem nao conhece muito bem o sistema BRT do Rio e quer entender melhor onde o veiculo esta. Mas por enquanto, vou deixar essa funçao comentada, e quando eu tiver as rotas de todas estaçoes atualizadas, eu descomento ela e mostro a estaçao mais proxima de cada veiculo no popup.
  if (corredorKey && corredores[corredorKey] && !isNaN(busLat) && !isNaN(busLng)) {
    const { estacao, distKm } = getEstacaoMaisProxima(busLat, busLng, corredores[corredorKey])
    stationHtml = `
      <div style="margin-top: 8px; padding: 10px; background: rgba(255,255,255,0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.6); border-radius: 10px; display: flex; align-items: center; gap: 10px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${corredores[corredorKey].cor}; box-shadow: 0 0 0 2px rgba(255,255,255,0.5);"></div>
        <div>
          <div style="font-size: 10px; color: #6b7280; font-weight: 600;">PRÓXIMA ESTAÇÃO</div>
          <div style="font-size: 14px; color: #1f2937; font-weight: 700;">${estacao.nome}</div>
          <div style="font-size: 11px; color: #6b7280;">${formatDistancia(distKm)} • ${corredores[corredorKey].nome}</div>
        </div>
      </div>
    `
  }

  return `
    <div style="font-family: 'Geist', system-ui, sans-serif; min-width: 260px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 16px; padding: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #1e293b, #0f172a); display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
              <rect x="4" y="3" width="16" height="14" rx="2" fill="white" fill-opacity="0.2"/>
              <circle cx="8" cy="19" r="2" fill="white"/>
              <circle cx="16" cy="19" r="2" fill="white"/>
            </svg>
          </div>
          <div>
            <strong style="font-size: 16px; font-family: 'Geist Mono', monospace; color: #0f172a;">${v.veiculo || "N/A"}</strong>
            <div style="font-size: 12px; color: #64748b;">Linha ${v.linha || "?"}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; background: ${statusBg}; padding: 4px 10px; border-radius: 30px; border: 1px solid ${statusColor}20;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; animation: ${isMoving ? 'pulse 1.5s infinite' : 'none'};"></div>
          <span style="font-size: 11px; color: ${statusColor}; font-weight: 600;">${statusText}</span>
        </div>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 12px; margin-bottom: 8px;">
        <div style="display: grid; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Velocidade</span> 
            <span style="color: #0f172a; font-weight: 700; font-family: 'Geist Mono', monospace;">${vel} km/h</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Sentido</span> 
            <span style="color: #0f172a; font-weight: 600;">${v.sentido || "N/A"}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Trajeto</span> 
            <span style="color: #0f172a; font-weight: 500; text-align: right; max-width: 160px;">${v.trajeto || "N/A"}</span>
          </div>
          ${v.placa ? `
          <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
            <span style="color: #64748b;">Placa</span> 
            <span style="color: #0f172a; font-weight: 600; font-family: 'Geist Mono', monospace;">${v.placa}</span>
          </div>` : ""}
        </div>
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-22.9064, -43.1761],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    })

    ///atualizei essa imagem do satelite para uma mais clara, pois a anterior estava muito escura e dificultava a visualização dos veículos
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }
    ).addTo(map)

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
        pane: "overlayPane",
      }
    ).addTo(map)

    L.control.scale({ imperial: false, metric: true }).addTo(map)

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
            `<div style="font-family: 'Geist', system-ui, sans-serif; padding: 8px; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px;">
              <strong style="color: #3b82f6; font-size: 14px;"> Você está aqui</strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</div>
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
              maxWidth: 320,
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

  // Fly to selected vehicle with smooth animation
  useEffect(() => {
    if (selectedId && markersRef.current[selectedId] && mapRef.current) {
      const marker = markersRef.current[selectedId]
      mapRef.current.flyTo(marker.getLatLng(), 16, { 
        duration: 1.2,
        easeLinearity: 0.25
      })
      setTimeout(() => marker.openPopup(), 400)
    }
  }, [selectedId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label="Mapa de veículos BRT do Rio de Janeiro"
    />
  )
}