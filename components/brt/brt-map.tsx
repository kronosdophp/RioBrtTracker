"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Veiculo } from "@/lib/types"
import { estimarChegada, formatDistancia } from "@/lib/geo-utils"
import { getCorredorFromTrajeto } from "@/lib/brt-stations"
import {
  type StationFeature,
  type NearbyStation,
  findNearestStation,
  getStatusText,
  getStatusColor,
} from "@/lib/station-utils"

interface BRTMapProps {
  veiculos: Veiculo[]
  selectedId: string | null
  onSelectVeiculo: (id: string) => void
  userLocation: { lat: number; lng: number } | null
}

// Cores para cada corredor BRT
const corredorCores: Record<string, string> = {
  "Transcarioca": "#3b82f6",
  "Transolímpica": "#10b981", 
  "Transoeste": "#f59e0b",
  "Lote Zero": "#8b5cf6",
  "Transbrasil": "#ef4444",
}

// Tipo para GeoJSON de rotas
interface BRTRouteFeature {
  type: "Feature"
  properties: {
    nome: string
    km: number
    ano: string
  }
  geometry: {
    type: "MultiLineString"
    coordinates: number[][][]
  }
}

// Tipo para GeoJSON de estações
interface BRTStationFeature {
  type: "Feature"
  properties: {
    Nome: string
    Flg_TransCarioca: number
    Flg_TransBrasil: number
    Flg_TransOeste: number
    Flg_TransOlimpica: number
    Integra_Trem: number
    Integra_Metro: number
    Integra_Aeroporto: number
  }
  geometry: {
    type: "Point"
    coordinates: [number, number]
  }
}

function createBusIcon(isMoving: boolean, isSelected: boolean, isAtStation?: boolean) {
  const size = isSelected ? 40 : 32
  const bgColor = isSelected 
    ? "#8b5cf6" 
    : isAtStation 
      ? "#3b82f6" // Azul quando na estação
      : isMoving 
        ? "#10b981" 
        : "#f59e0b"
  
  const pulseClass = isMoving && !isSelected ? "bus-pulse" : ""
  const ring = isSelected 
    ? `box-shadow: 0 0 0 4px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.5);` 
    : isAtStation
      ? `box-shadow: 0 0 0 4px rgba(59,130,246,0.4), 0 4px 12px rgba(0,0,0,0.4);`
      : `box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.5);`
  
  // Indicador de estação (pequeno ponto)
  const stationIndicator = isAtStation && !isSelected ? `
    <div style="
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="6" height="6" viewBox="0 0 24 24" fill="white">
        <circle cx="12" cy="12" r="8"/>
      </svg>
    </div>
  ` : ""

  return L.divIcon({
    className: "bus-marker-icon",
    html: `<div class="${pulseClass}" style="
      position: relative;
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
      ${stationIndicator}
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
  userLoc: { lat: number; lng: number } | null,
  nearbyStation: NearbyStation | null
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

  // Seção de estação próxima usando dados reais do GeoJSON
  let stationHtml = ""
  if (nearbyStation) {
    const stationStatusColor = getStatusColor(nearbyStation.status)
    const stationStatusText = getStatusText(nearbyStation.status)
    const isAtStation = nearbyStation.status === "na_estacao"
    
    stationHtml = `
      <div style="margin-top: 8px; padding: 10px; background: ${isAtStation ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' : 'rgba(255,255,255,0.8)'}; backdrop-filter: blur(8px); border: 1px solid ${isAtStation ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.6)'}; border-radius: 10px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <div style="
            width: 32px; 
            height: 32px; 
            border-radius: 8px; 
            background: ${nearbyStation.corCorredor}; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            flex-shrink: 0;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
            </svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span style="
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: ${stationStatusColor}20;
                color: ${stationStatusColor};
                padding: 2px 6px;
                border-radius: 4px;
              ">${stationStatusText}</span>
            </div>
            <div style="font-size: 14px; color: #1f2937; font-weight: 700; line-height: 1.2;">${nearbyStation.nome}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
              ${formatDistancia(nearbyStation.distanciaKm)} • ${nearbyStation.corredor}
            </div>
            ${nearbyStation.integracoes.length > 0 ? `
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                ${nearbyStation.integracoes.map(i => `
                  <span style="
                    font-size: 9px;
                    background: #f1f5f9;
                    color: #475569;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 500;
                  ">${i}</span>
                `).join("")}
              </div>
            ` : ""}
          </div>
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
  const routesLayerRef = useRef<L.LayerGroup | null>(null)
  const stationsLayerRef = useRef<L.LayerGroup | null>(null)
  const stationsDataRef = useRef<StationFeature[]>([])
  const [showRoutes, setShowRoutes] = useState(true)
  const [showStations, setShowStations] = useState(true)

  useEffect(() => {
    onSelectRef.current = onSelectVeiculo
  }, [onSelectVeiculo])

  useEffect(() => {
    userLocRef.current = userLocation
  }, [userLocation])

  // Carrega e renderiza as rotas e estações do GeoJSON
  const loadGeoJSONData = useCallback(async () => {
    try {
      // Carrega rotas
      const routesRes = await fetch("/data/brt_routes.geojson")
      const routesData = await routesRes.json()
      
      // Verifica se o mapa ainda existe após o fetch
      const map = mapRef.current
      if (!map) return
      
      const routesLayer = L.layerGroup()
      
      routesData.features.forEach((feature: BRTRouteFeature) => {
        const cor = corredorCores[feature.properties.nome] || "#6b7280"
        
        // MultiLineString pode ter múltiplos segmentos
        feature.geometry.coordinates.forEach((lineCoords) => {
          const latLngs = lineCoords.map((coord) => [coord[1], coord[0]] as [number, number])
          
          L.polyline(latLngs, {
            color: cor,
            weight: 5,
            opacity: 0.8,
            lineCap: "round",
            lineJoin: "round",
          })
            .bindPopup(`
              <div style="font-family: 'Geist', system-ui, sans-serif; padding: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${cor};"></div>
                  <strong style="font-size: 14px; color: #0f172a;">${feature.properties.nome}</strong>
                </div>
                <div style="font-size: 12px; color: #64748b;">
                  ${feature.properties.km.toFixed(1)} km - Inaugurado em ${feature.properties.ano}
                </div>
              </div>
            `)
            .addTo(routesLayer)
        })
      })
      
      // Verifica novamente antes de adicionar ao mapa
      if (!mapRef.current) return
      
      routesLayer.addTo(mapRef.current)
      routesLayerRef.current = routesLayer

      // Carrega estações
      const stationsRes = await fetch("/data/brt_stations.geojson")
      const stationsData = await stationsRes.json()
      
      // Verifica se o mapa ainda existe
      if (!mapRef.current) return
      
      const stationsLayer = L.layerGroup()
      
      stationsData.features.forEach((feature: BRTStationFeature) => {
        const [lng, lat] = feature.geometry.coordinates
        const props = feature.properties
        
        // Determina a cor baseado no corredor principal
        let cor = "#6b7280"
        if (props.Flg_TransCarioca) cor = corredorCores["Transcarioca"]
        else if (props.Flg_TransBrasil) cor = corredorCores["Transbrasil"]
        else if (props.Flg_TransOeste) cor = corredorCores["Transoeste"]
        else if (props.Flg_TransOlimpica) cor = corredorCores["Transolímpica"]
        
        // Ícones de integração
        const integracoes: string[] = []
        if (props.Integra_Trem) integracoes.push("Trem")
        if (props.Integra_Metro) integracoes.push("Metrô")
        if (props.Integra_Aeroporto) integracoes.push("Aeroporto")
        
        const stationIcon = L.divIcon({
          className: "station-marker",
          html: `<div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${cor};
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
        
        L.marker([lat, lng], { icon: stationIcon })
          .bindPopup(`
            <div style="font-family: 'Geist', system-ui, sans-serif; padding: 8px; min-width: 180px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: ${cor};"></div>
                <strong style="font-size: 14px; color: #0f172a;">${props.Nome}</strong>
              </div>
              ${integracoes.length > 0 ? `
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${integracoes.map(i => `
                    <span style="
                      font-size: 10px;
                      background: #f1f5f9;
                      color: #475569;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-weight: 500;
                    ">${i}</span>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          `)
          .addTo(stationsLayer)
      })
      
      // Verifica novamente antes de adicionar ao mapa
      if (!mapRef.current) return
      
      stationsLayer.addTo(mapRef.current)
      stationsLayerRef.current = stationsLayer
      
      // Salva os dados das estações para uso na detecção de proximidade
      stationsDataRef.current = stationsData.features as StationFeature[]
      
    } catch (error) {
      console.error("[v0] Erro ao carregar dados GeoJSON:", error)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-22.9064, -43.1761],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    })

    // Imagem de satélite
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
    
    // Carrega os dados GeoJSON
    loadGeoJSONData()

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = {}
      routesLayerRef.current = null
      stationsLayerRef.current = null
    }
  }, [loadGeoJSONData])
  
  // Controla visibilidade das rotas
  useEffect(() => {
    if (!mapRef.current || !routesLayerRef.current) return
    if (showRoutes) {
      routesLayerRef.current.addTo(mapRef.current)
    } else {
      mapRef.current.removeLayer(routesLayerRef.current)
    }
  }, [showRoutes])
  
  // Controla visibilidade das estações
  useEffect(() => {
    if (!mapRef.current || !stationsLayerRef.current) return
    if (showStations) {
      stationsLayerRef.current.addTo(mapRef.current)
    } else {
      mapRef.current.removeLayer(stationsLayerRef.current)
    }
  }, [showStations])

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
      const stations = stationsDataRef.current

      veiculos.forEach((v) => {
        const id = v.id || v.veiculo || ""
        if (!id) return

        currentIds.add(id)
        const lat = Number(v.latitude)
        const lng = Number(v.longitude)

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return

        const isMoving = (Number(v.velocidade) || 0) > 0
        const isSelected = selectedId === id
        
        // Encontra a estação mais próxima usando dados reais do GeoJSON
        const corredorTrajeto = getCorredorFromTrajeto(v.trajeto)
        const nearbyStation = findNearestStation(lat, lng, stations, corredorTrajeto)
        const isAtStation = nearbyStation?.status === "na_estacao"

        if (markersRef.current[id]) {
          markersRef.current[id].setLatLng([lat, lng])
          markersRef.current[id].setIcon(createBusIcon(isMoving, isSelected, isAtStation))
          const popup = markersRef.current[id].getPopup()
          if (popup) {
            popup.setContent(createPopupContent(v, userLocRef.current, nearbyStation))
          }
        } else {
          const marker = L.marker([lat, lng], {
            icon: createBusIcon(isMoving, isSelected, isAtStation),
          })
            .bindPopup(createPopupContent(v, userLocRef.current, nearbyStation), {
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
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Mapa de veículos BRT do Rio de Janeiro"
      />
      
      {/* Controles de camadas */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2 rounded-lg bg-background/95 p-3 shadow-lg backdrop-blur-sm border border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Camadas</span>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="rounded border-border"
          />
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-primary rounded"></span>
            Rotas
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showStations}
            onChange={(e) => setShowStations(e.target.checked)}
            className="rounded border-border"
          />
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            Estações
          </span>
        </label>
        
        {/* Legenda de status dos veículos */}
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Veículos</span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-full" style={{ background: "#10b981" }}></span>
              <span className="text-foreground">Em movimento</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }}></span>
              <span className="text-foreground">Parado</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-full relative" style={{ background: "#3b82f6" }}>
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white"></span>
              </span>
              <span className="text-foreground">Na estação</span>
            </div>
          </div>
        </div>
        
        {/* Legenda de cores dos corredores */}
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Corredores</span>
          <div className="flex flex-col gap-1">
            {Object.entries(corredorCores).map(([nome, cor]) => (
              <div key={nome} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ background: cor }}></span>
                <span className="text-foreground">{nome}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
