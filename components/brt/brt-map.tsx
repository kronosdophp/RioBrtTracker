"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Switch } from "@/components/ui/switch"
import type { Veiculo } from "@/lib/types"
import { estimarChegada, formatDistancia, haversineKm } from "@/lib/geo-utils"
import { getCorredorFromTrajeto } from "@/lib/brt-stations"
import {
  type NearbyStation,
  type StationFeature,
  findNearestStation,
  getStatusColor,
  getStatusText,
} from "@/lib/station-utils"

interface BRTMapProps {
  veiculos: Veiculo[]
  selectedId: string | null
  onSelectVeiculo: (id: string) => void
  userLocation: { lat: number; lng: number } | null
  userLocationFocusSignal: number
  showStoppedVehicles: boolean
  onShowStoppedVehiclesChange: (checked: boolean) => void
}

type BaseMapStyle = "roadmap" | "satellite"
type CorredorKey =
  | "transcarioca"
  | "transolimpica"
  | "transoeste"
  | "lote-zero"
  | "transbrasil"
  | "desconhecido"

interface MarkerRenderState {
  lat: number
  lng: number
  iconKey: string
  popupKey: string
}

interface CorredorVisualStyle {
  nome: string
  stroke: string
  casing: string
  stationFill: string
  stationStroke: string
}

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

const CORRIDOR_ORDER: CorredorKey[] = [
  "transcarioca",
  "transolimpica",
  "transoeste",
  "lote-zero",
  "transbrasil",
]

const ROADMAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
const SATELLITE_LABELS_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
const MAP_STYLE_STORAGE_KEY = "rio-brt:map-style"
const SHOW_ROUTES_STORAGE_KEY = "rio-brt:show-routes"
const SHOW_STATIONS_STORAGE_KEY = "rio-brt:show-stations"

const CORRIDOR_STYLES: Record<
  BaseMapStyle,
  Record<CorredorKey, CorredorVisualStyle>
> = {
  roadmap: {
    transcarioca: {
      nome: "Transcarioca",
      stroke: "#2563eb",
      casing: "rgba(255,255,255,0.92)",
      stationFill: "#2563eb",
      stationStroke: "#dbeafe",
    },
    transolimpica: {
      nome: "Transolimpica",
      stroke: "#0f9f6e",
      casing: "rgba(255,255,255,0.92)",
      stationFill: "#10b981",
      stationStroke: "#d1fae5",
    },
    transoeste: {
      nome: "Transoeste",
      stroke: "#d97706",
      casing: "rgba(255,255,255,0.92)",
      stationFill: "#f59e0b",
      stationStroke: "#fef3c7",
    },
    "lote-zero": {
      nome: "Lote Zero",
      stroke: "#7c3aed",
      casing: "rgba(255,255,255,0.92)",
      stationFill: "#8b5cf6",
      stationStroke: "#ede9fe",
    },
    transbrasil: {
      nome: "Transbrasil",
      stroke: "#dc2626",
      casing: "rgba(255,255,255,0.92)",
      stationFill: "#ef4444",
      stationStroke: "#fee2e2",
    },
    desconhecido: {
      nome: "Desconhecido",
      stroke: "#475569",
      casing: "rgba(255,255,255,0.92)",
      stationFill: "#64748b",
      stationStroke: "#e2e8f0",
    },
  },
  satellite: {
    transcarioca: {
      nome: "Transcarioca",
      stroke: "#7dd3fc",
      casing: "rgba(15,23,42,0.88)",
      stationFill: "#38bdf8",
      stationStroke: "#0f172a",
    },
    transolimpica: {
      nome: "Transolimpica",
      stroke: "#6ee7b7",
      casing: "rgba(15,23,42,0.88)",
      stationFill: "#34d399",
      stationStroke: "#0f172a",
    },
    transoeste: {
      nome: "Transoeste",
      stroke: "#fbbf24",
      casing: "rgba(15,23,42,0.88)",
      stationFill: "#f59e0b",
      stationStroke: "#0f172a",
    },
    "lote-zero": {
      nome: "Lote Zero",
      stroke: "#c4b5fd",
      casing: "rgba(15,23,42,0.88)",
      stationFill: "#a78bfa",
      stationStroke: "#0f172a",
    },
    transbrasil: {
      nome: "Transbrasil",
      stroke: "#fda4af",
      casing: "rgba(15,23,42,0.88)",
      stationFill: "#fb7185",
      stationStroke: "#0f172a",
    },
    desconhecido: {
      nome: "Desconhecido",
      stroke: "#cbd5e1",
      casing: "rgba(15,23,42,0.88)",
      stationFill: "#94a3b8",
      stationStroke: "#0f172a",
    },
  },
}

function normalizeCorredorKey(nome?: string | null): CorredorKey {
  const normalized = (nome || "").toLowerCase()

  if (normalized.includes("transcarioca")) return "transcarioca"
  if (normalized.includes("transol")) return "transolimpica"
  if (normalized.includes("transoeste")) return "transoeste"
  if (normalized.includes("lote zero")) return "lote-zero"
  if (normalized.includes("transbrasil")) return "transbrasil"

  return "desconhecido"
}

function getCorredorStyle(nome: string | null | undefined, baseMapStyle: BaseMapStyle) {
  return CORRIDOR_STYLES[baseMapStyle][normalizeCorredorKey(nome)]
}

function getCorredorLegend(baseMapStyle: BaseMapStyle) {
  return CORRIDOR_ORDER.map((key) => CORRIDOR_STYLES[baseMapStyle][key])
}

function calculateSegmentLengthKm(line: [number, number][]) {
  let total = 0

  for (let index = 1; index < line.length; index += 1) {
    total += haversineKm(
      line[index - 1][0],
      line[index - 1][1],
      line[index][0],
      line[index][1]
    )
  }

  return total
}

function createEndpointKey(line: [number, number][]) {
  const start = line[0]
  const end = line[line.length - 1]
  const startKey = `${start[0].toFixed(4)},${start[1].toFixed(4)}`
  const endKey = `${end[0].toFixed(4)},${end[1].toFixed(4)}`

  return [startKey, endKey].sort().join("__")
}

function normalizeRouteSegments(coordinates: number[][][]) {
  const dedupedByEndpoints = new Map<
    string,
    { latLngs: [number, number][]; lengthKm: number }
  >()

  coordinates.forEach((line) => {
    const latLngs = line.map((coord) => [coord[1], coord[0]] as [number, number])
    const lengthKm = calculateSegmentLengthKm(latLngs)

    if (latLngs.length < 2 || lengthKm < 0.008) {
      return
    }

    const key = createEndpointKey(latLngs)
    const current = dedupedByEndpoints.get(key)

    if (!current || current.lengthKm < lengthKm) {
      dedupedByEndpoints.set(key, { latLngs, lengthKm })
    }
  })

  const cleanedSegments = Array.from(dedupedByEndpoints.values()).filter(
    ({ latLngs, lengthKm }) => {
      const endpointDistance = haversineKm(
        latLngs[0][0],
        latLngs[0][1],
        latLngs[latLngs.length - 1][0],
        latLngs[latLngs.length - 1][1]
      )
      const isSmallLoop = endpointDistance < 0.03 && lengthKm < 0.25

      if (isSmallLoop) return false
      if (lengthKm >= 0.08) return true

      return latLngs.length >= 5
    }
  )

  return (cleanedSegments.length > 0
    ? cleanedSegments
    : Array.from(dedupedByEndpoints.values())
  )
    .sort((left, right) => right.lengthKm - left.lengthKm)
    .map((segment) => segment.latLngs)
}

function createBusIcon(isMoving: boolean, isSelected: boolean, isAtStation?: boolean) {
  const size = isSelected ? 40 : 32
  const bgColor = isSelected
    ? "#8b5cf6"
    : isAtStation
      ? "#3b82f6"
      : isMoving
        ? "#10b981"
        : "#f59e0b"

  const ring = isSelected
    ? "box-shadow: 0 0 0 4px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.5);"
    : isAtStation
      ? "box-shadow: 0 0 0 4px rgba(59,130,246,0.4), 0 4px 12px rgba(0,0,0,0.4);"
      : "box-shadow: 0 3px 10px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.5);"

  const stationIndicator = isAtStation && !isSelected
    ? `
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
    `
    : ""

  return L.divIcon({
    className: "bus-marker-icon",
    html: `<div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${bgColor};
      ${ring}
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
      will-change: transform;
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
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3b82f6;
      border: 4px solid white;
      box-shadow: 0 0 0 6px rgba(59,130,246,0.3), 0 8px 16px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback
  }

  const storedValue = window.localStorage.getItem(key)

  if (storedValue === "true") return true
  if (storedValue === "false") return false

  return fallback
}

function readStoredBaseMapStyle() {
  if (typeof window === "undefined") {
    return "roadmap" as BaseMapStyle
  }

  const storedValue = window.localStorage.getItem(MAP_STYLE_STORAGE_KEY)
  return storedValue === "satellite" ? "satellite" : "roadmap"
}

function clearCanvasRenderer(renderer: L.Canvas | null) {
  const rendererContainer = (
    renderer as L.Canvas & { _container?: HTMLCanvasElement | null }
  )?._container

  if (!rendererContainer) {
    return
  }

  const context = rendererContainer.getContext("2d")
  if (!context) {
    return
  }

  context.clearRect(0, 0, rendererContainer.width, rendererContainer.height)
}

function patchFirefoxMouseEventDeprecations() {
  if (typeof window === "undefined" || typeof window.MouseEvent === "undefined") {
    return
  }

  const mappings = [
    {
      key: "mozPressure",
      getter: (event: MouseEvent) => {
        const pressure = (event as MouseEvent & { pressure?: number }).pressure
        return typeof pressure === "number" ? pressure : event.buttons > 0 ? 0.5 : 0
      },
    },
    {
      key: "mozInputSource",
      getter: (event: MouseEvent) => {
        const pointerType = (event as MouseEvent & { pointerType?: string }).pointerType

        switch (pointerType) {
          case "mouse":
            return 1
          case "pen":
            return 2
          case "touch":
            return 5
          default:
            return 0
        }
      },
    },
  ] as const

  mappings.forEach(({ key, getter }) => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window.MouseEvent.prototype, key)

      if (descriptor && descriptor.configurable === false) {
        return
      }

      Object.defineProperty(window.MouseEvent.prototype, key, {
        configurable: true,
        get() {
          return getter(this as MouseEvent)
        },
      })
    } catch {
      // Firefox may refuse to redefine these accessors; ignore and keep the map functional.
    }
  })
}

function createRoadmapLayer() {
  return L.tileLayer(ROADMAP_TILE_URL, {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 2,
  })
}

function createSatelliteLayer() {
  return L.tileLayer(SATELLITE_TILE_URL, {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 19,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 1,
  })
}

function createSatelliteLabelsLayer() {
  return L.tileLayer(SATELLITE_LABELS_TILE_URL, {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
    pane: "labels",
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 1,
  })
}

function createRoutePopupContent(
  feature: BRTRouteFeature,
  style: CorredorVisualStyle
) {
  return `
    <div style="font-family: 'Geist', system-ui, sans-serif; padding: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${style.stroke};"></div>
        <strong style="font-size: 14px; color: #0f172a;">${feature.properties.nome}</strong>
      </div>
      <div style="font-size: 12px; color: #64748b;">
        ${feature.properties.km.toFixed(1)} km - Inaugurado em ${feature.properties.ano}
      </div>
    </div>
  `
}

function createStationPopupContent(
  props: BRTStationFeature["properties"],
  style: CorredorVisualStyle,
  integracoes: string[]
) {
  return `
    <div style="font-family: 'Geist', system-ui, sans-serif; padding: 8px; min-width: 180px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${style.stationFill};"></div>
        <strong style="font-size: 14px; color: #0f172a;">${props.Nome}</strong>
      </div>
      ${integracoes.length > 0 ? `
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${integracoes.map((integracao) => `
            <span style="
              font-size: 10px;
              background: #f1f5f9;
              color: #475569;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 500;
            ">${integracao}</span>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `
}

function getMarkerRenderState(
  v: Veiculo,
  lat: number,
  lng: number,
  isMoving: boolean,
  isSelected: boolean,
  nearbyStation: NearbyStation | null,
  userLocation: { lat: number; lng: number } | null
): MarkerRenderState {
  const iconKey = [
    isMoving ? "moving" : "stopped",
    isSelected ? "selected" : "idle",
    nearbyStation?.status || "none",
  ].join(":")

  const popupKey = [
    lat.toFixed(5),
    lng.toFixed(5),
    v.veiculo || "",
    v.linha || "",
    v.velocidade || "",
    v.sentido || "",
    v.trajeto || "",
    v.placa || "",
    userLocation ? `${userLocation.lat.toFixed(5)}:${userLocation.lng.toFixed(5)}` : "no-user-location",
    nearbyStation
      ? `${nearbyStation.nome}:${nearbyStation.status}:${nearbyStation.distanciaKm.toFixed(3)}`
      : "no-station",
  ].join("|")

  return { lat, lng, iconKey, popupKey }
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
  if (userLoc && !Number.isNaN(busLat) && !Number.isNaN(busLng)) {
    const eta = estimarChegada(busLat, busLng, vel, userLoc.lat, userLoc.lng)
    etaHtml = `
      <div style="margin-top: 12px; padding: 12px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; color: white;">
        <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; opacity: 0.9;">Previsao de chegada</div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span style="font-size: 24px; font-weight: 800; font-family: 'Geist Mono', monospace;">${eta.texto}</span>
          <span style="font-size: 12px; font-weight: 500; opacity: 0.9;">${formatDistancia(eta.distanciaKm)}</span>
        </div>
        <div style="font-size: 10px; margin-top: 4px; opacity: 0.8;">${vel > 5 ? "Baseado na velocidade atual" : "Estimativa media"}</div>
      </div>
    `
  }

  let stationHtml = ""
  if (nearbyStation) {
    const stationStatusColor = getStatusColor(nearbyStation.status)
    const stationStatusText = getStatusText(nearbyStation.status)
    const isAtStation = nearbyStation.status === "na_estacao"

    stationHtml = `
      <div style="margin-top: 8px; padding: 10px; background: ${isAtStation ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))" : "rgba(255,255,255,0.8)"}; backdrop-filter: blur(8px); border: 1px solid ${isAtStation ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.6)"}; border-radius: 10px;">
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
              ${formatDistancia(nearbyStation.distanciaKm)} - ${nearbyStation.corredor}
            </div>
            ${nearbyStation.integracoes.length > 0 ? `
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                ${nearbyStation.integracoes.map((integracao) => `
                  <span style="
                    font-size: 9px;
                    background: #f1f5f9;
                    color: #475569;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 500;
                  ">${integracao}</span>
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
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
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
            </div>
          ` : ""}
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
  userLocationFocusSignal,
  showStoppedVehicles,
  onShowStoppedVehiclesChange,
}: BRTMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})
  const markerStateRef = useRef<Record<string, MarkerRenderState>>({})
  const userMarkerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelectVeiculo)
  const userLocRef = useRef(userLocation)
  const routeDataRef = useRef<BRTRouteFeature[]>([])
  const baseLayerRef = useRef<L.TileLayer | null>(null)
  const labelsLayerRef = useRef<L.TileLayer | null>(null)
  const routesLayerRef = useRef<L.LayerGroup | null>(null)
  const stationsLayerRef = useRef<L.LayerGroup | null>(null)
  const stationsDataRef = useRef<StationFeature[]>([])
  const routesRendererRef = useRef<L.Canvas | null>(null)
  const stationsRendererRef = useRef<L.Canvas | null>(null)
  const frameRef = useRef<number | null>(null)
  const latestFocusSignalRef = useRef(0)
  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapStyle>("roadmap")
  const [showRoutes, setShowRoutes] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [geoDataReady, setGeoDataReady] = useState(false)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelectVeiculo
  }, [onSelectVeiculo])

  useEffect(() => {
    userLocRef.current = userLocation
  }, [userLocation])

  useEffect(() => {
    setBaseMapStyle(readStoredBaseMapStyle())
    setShowRoutes(readStoredBoolean(SHOW_ROUTES_STORAGE_KEY, true))
    setShowStations(readStoredBoolean(SHOW_STATIONS_STORAGE_KEY, true))
    setPreferencesLoaded(true)
  }, [])

  useEffect(() => {
    if (!preferencesLoaded || typeof window === "undefined") return
    window.localStorage.setItem(MAP_STYLE_STORAGE_KEY, baseMapStyle)
  }, [baseMapStyle, preferencesLoaded])

  useEffect(() => {
    if (!preferencesLoaded || typeof window === "undefined") return
    window.localStorage.setItem(SHOW_ROUTES_STORAGE_KEY, String(showRoutes))
  }, [preferencesLoaded, showRoutes])

  useEffect(() => {
    if (!preferencesLoaded || typeof window === "undefined") return
    window.localStorage.setItem(SHOW_STATIONS_STORAGE_KEY, String(showStations))
  }, [preferencesLoaded, showStations])

  const renderStaticLayers = useCallback(() => {
    const map = mapRef.current
    if (!map || !geoDataReady) return

    if (routesLayerRef.current) {
      routesLayerRef.current.clearLayers()
      map.removeLayer(routesLayerRef.current)
      routesLayerRef.current = null
      clearCanvasRenderer(routesRendererRef.current)
    }

    if (stationsLayerRef.current) {
      stationsLayerRef.current.clearLayers()
      map.removeLayer(stationsLayerRef.current)
      stationsLayerRef.current = null
      clearCanvasRenderer(stationsRendererRef.current)
    }

    const routesRenderer = routesRendererRef.current || undefined
    const stationsRenderer = stationsRendererRef.current || undefined

    if (showRoutes && routeDataRef.current.length > 0) {
      const routesLayer = L.layerGroup()

      routeDataRef.current.forEach((feature) => {
        const style = getCorredorStyle(feature.properties.nome, baseMapStyle)
        const normalizedSegments = normalizeRouteSegments(feature.geometry.coordinates)

        if (normalizedSegments.length === 0) return

        L.polyline(normalizedSegments, {
          color: style.casing,
          weight: baseMapStyle === "roadmap" ? 7 : 8,
          opacity: baseMapStyle === "roadmap" ? 0.9 : 0.95,
          pane: "routes",
          interactive: false,
          lineCap: "round",
          lineJoin: "round",
          smoothFactor: 1.4,
          renderer: routesRenderer,
        }).addTo(routesLayer)

        L.polyline(normalizedSegments, {
          color: style.stroke,
          weight: baseMapStyle === "roadmap" ? 3.8 : 4.5,
          opacity: 0.95,
          pane: "routes",
          lineCap: "round",
          lineJoin: "round",
          smoothFactor: 1.4,
          renderer: routesRenderer,
        })
          .bindPopup(createRoutePopupContent(feature, style), {
            maxWidth: 280,
            className: "brt-popup",
          })
          .addTo(routesLayer)
      })

      routesLayer.addTo(map)
      routesLayerRef.current = routesLayer
    }

    if (showStations && stationsDataRef.current.length > 0) {
      const stationsLayer = L.layerGroup()

      stationsDataRef.current.forEach((feature) => {
        const stationFeature = feature as BRTStationFeature
        const [lng, lat] = stationFeature.geometry.coordinates
        const props = stationFeature.properties
        let corredorNome = "desconhecido"

        if (props.Flg_TransCarioca) corredorNome = "transcarioca"
        else if (props.Flg_TransBrasil) corredorNome = "transbrasil"
        else if (props.Flg_TransOeste) corredorNome = "transoeste"
        else if (props.Flg_TransOlimpica) corredorNome = "transolimpica"

        const style = getCorredorStyle(corredorNome, baseMapStyle)
        const integracoes: string[] = []

        if (props.Integra_Trem) integracoes.push("Trem")
        if (props.Integra_Metro) integracoes.push("Metro")
        if (props.Integra_Aeroporto) integracoes.push("Aeroporto")

        L.circleMarker([lat, lng], {
          radius: 5,
          color: style.stationStroke,
          weight: 2,
          fillColor: style.stationFill,
          fillOpacity: 1,
          pane: "stations",
          renderer: stationsRenderer,
        })
          .bindPopup(createStationPopupContent(props, style, integracoes), {
            maxWidth: 260,
            className: "brt-popup",
          })
          .addTo(stationsLayer)
      })

      stationsLayer.addTo(map)
      stationsLayerRef.current = stationsLayer
    }
  }, [baseMapStyle, geoDataReady, showRoutes, showStations])

  const loadGeoJSONData = useCallback(async () => {
    try {
      const [routesRes, stationsRes] = await Promise.all([
        fetch("/data/brt_routes.geojson"),
        fetch("/data/brt_stations.geojson"),
      ])

      if (!routesRes.ok || !stationsRes.ok) {
        throw new Error("Falha ao carregar as camadas do mapa.")
      }

      const [routesData, stationsData] = await Promise.all([
        routesRes.json(),
        stationsRes.json(),
      ])

      routeDataRef.current = routesData.features as BRTRouteFeature[]
      stationsDataRef.current = stationsData.features as StationFeature[]
      setGeoDataReady(true)
    } catch (error) {
      console.error("[v0] Erro ao carregar dados GeoJSON:", error)
    }
  }, [])

  const applyBaseMap = useCallback((style: BaseMapStyle) => {
    const map = mapRef.current
    if (!map) return

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current)
      baseLayerRef.current = null
    }

    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current)
      labelsLayerRef.current = null
    }

    const baseLayer = style === "satellite" ? createSatelliteLayer() : createRoadmapLayer()
    baseLayer.addTo(map)
    baseLayerRef.current = baseLayer

    if (style === "satellite") {
      const labelsLayer = createSatelliteLabelsLayer()
      labelsLayer.addTo(map)
      labelsLayerRef.current = labelsLayer
    }

    window.requestAnimationFrame(() => map.invalidateSize(false))
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    patchFirefoxMouseEventDeprecations()

    const map = L.map(containerRef.current, {
      center: [-22.9064, -43.1761],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    })

    map.createPane("routes")
    map.createPane("stations")
    map.createPane("labels")

    const routesPane = map.getPane("routes")
    const stationsPane = map.getPane("stations")
    const labelsPane = map.getPane("labels")
    if (routesPane) {
      routesPane.style.zIndex = "390"
    }
    if (stationsPane) {
      stationsPane.style.zIndex = "420"
    }
    if (labelsPane) {
      labelsPane.style.zIndex = "450"
      labelsPane.style.pointerEvents = "none"
    }

    routesRendererRef.current = L.canvas({ padding: 0.5, pane: "routes" })
    stationsRendererRef.current = L.canvas({ padding: 0.5, pane: "stations" })
    L.control.scale({ imperial: false, metric: true }).addTo(map)

    mapRef.current = map
    window.requestAnimationFrame(() => map.invalidateSize())
    void loadGeoJSONData()

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }

      map.remove()
      mapRef.current = null
      markersRef.current = {}
      markerStateRef.current = {}
      routeDataRef.current = []
      routesLayerRef.current = null
      stationsLayerRef.current = null
      baseLayerRef.current = null
      labelsLayerRef.current = null
      routesRendererRef.current = null
      stationsRendererRef.current = null
      stationsDataRef.current = []
    }
  }, [loadGeoJSONData])

  useEffect(() => {
    const map = mapRef.current
    const container = containerRef.current

    if (!map || !container || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => map.invalidateSize(false))
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    applyBaseMap(baseMapStyle)
  }, [applyBaseMap, baseMapStyle])

  useEffect(() => {
    if (!mapRef.current || !geoDataReady) return
    renderStaticLayers()
  }, [geoDataReady, renderStaticLayers])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
      } else {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: createUserIcon(),
          zIndexOffset: 1000,
        })
          .bindPopup(
            `<div style="font-family: 'Geist', system-ui, sans-serif; padding: 8px; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px;">
              <strong style="color: #3b82f6; font-size: 14px;">Voce esta aqui</strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</div>
            </div>`
          )
          .addTo(map)
      }

      return
    }

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }
  }, [userLocation])

  useEffect(() => {
    if (
      !userLocation ||
      !mapRef.current ||
      latestFocusSignalRef.current === userLocationFocusSignal
    ) {
      return
    }

    latestFocusSignalRef.current = userLocationFocusSignal
    mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
      duration: 0.9,
      easeLinearity: 0.25,
    })

    window.setTimeout(() => {
      userMarkerRef.current?.openPopup()
    }, 250)
  }, [userLocation, userLocationFocusSignal])

  const updateMarkers = useCallback((items: Veiculo[], currentSelectedId: string | null) => {
    const map = mapRef.current
    if (!map) return

    const currentIds = new Set<string>()
    const stations = stationsDataRef.current

    items.forEach((veiculo) => {
      const id = veiculo.id || veiculo.veiculo || ""
      if (!id) return

      currentIds.add(id)
      const lat = Number(veiculo.latitude)
      const lng = Number(veiculo.longitude)

      if (Number.isNaN(lat) || Number.isNaN(lng) || lat === 0 || lng === 0) return

      const isMoving = (Number(veiculo.velocidade) || 0) > 0
      const isSelected = currentSelectedId === id
      const corredorTrajeto = getCorredorFromTrajeto(veiculo.trajeto ?? undefined)
      const nearbyStation = findNearestStation(lat, lng, stations, corredorTrajeto)
      const isAtStation = nearbyStation?.status === "na_estacao"
      const nextState = getMarkerRenderState(
        veiculo,
        lat,
        lng,
        isMoving,
        isSelected,
        nearbyStation,
        userLocRef.current
      )
      const existingMarker = markersRef.current[id]
      const previousState = markerStateRef.current[id]

      if (existingMarker) {
        if (!previousState || previousState.lat !== nextState.lat || previousState.lng !== nextState.lng) {
          existingMarker.setLatLng([lat, lng])
        }

        if (!previousState || previousState.iconKey !== nextState.iconKey) {
          existingMarker.setIcon(createBusIcon(isMoving, isSelected, isAtStation))
        }

        if (!previousState || previousState.popupKey !== nextState.popupKey) {
          const popup = existingMarker.getPopup()
          if (popup) {
            popup.setContent(createPopupContent(veiculo, userLocRef.current, nearbyStation))
          }
        }
      } else {
        const marker = L.marker([lat, lng], {
          icon: createBusIcon(isMoving, isSelected, isAtStation),
        })
          .bindPopup(createPopupContent(veiculo, userLocRef.current, nearbyStation), {
            maxWidth: 320,
            className: "brt-popup",
          })
          .addTo(map)

        marker.on("click", () => {
          onSelectRef.current(id)
        })

        markersRef.current[id] = marker
      }

      markerStateRef.current[id] = nextState
    })

    for (const id of Object.keys(markersRef.current)) {
      if (currentIds.has(id)) continue

      map.removeLayer(markersRef.current[id])
      delete markersRef.current[id]
      delete markerStateRef.current[id]
    }
  }, [])

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = window.requestAnimationFrame(() => {
      updateMarkers(veiculos, selectedId)
      frameRef.current = null
    })

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [geoDataReady, selectedId, updateMarkers, veiculos])

  useEffect(() => {
    if (!selectedId || !markersRef.current[selectedId] || !mapRef.current) return

    const marker = markersRef.current[selectedId]
    mapRef.current.flyTo(marker.getLatLng(), 16, {
      duration: 1,
      easeLinearity: 0.25,
    })

    window.setTimeout(() => marker.openPopup(), 300)
  }, [selectedId])

  const corredorLegend = getCorredorLegend(baseMapStyle)

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Mapa de veiculos BRT do Rio de Janeiro"
      />

      <div className="absolute bottom-4 left-4 z-[1000] flex max-w-[240px] flex-col gap-2 rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <div className="space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mapa
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBaseMapStyle("roadmap")}
              aria-pressed={baseMapStyle === "roadmap"}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                baseMapStyle === "roadmap"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              Padrao
            </button>
            <button
              type="button"
              onClick={() => setBaseMapStyle("satellite")}
              aria-pressed={baseMapStyle === "satellite"}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                baseMapStyle === "satellite"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              Satelite
            </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-2">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Camadas
          </span>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span
                  className="h-1 w-6 rounded-full"
                  style={{ background: corredorLegend[0]?.stroke }}
                ></span>
                <span>Rotas</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Corredores BRT corrigidos no mapa.
              </p>
            </div>
            <Switch
              checked={showRoutes}
              onCheckedChange={setShowRoutes}
              aria-label="Mostrar rotas"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: corredorLegend[0]?.stationFill,
                    border: `2px solid ${corredorLegend[0]?.stationStroke}`,
                  }}
                ></span>
                <span>Estacoes</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pontos oficiais das estacoes BRT.
              </p>
            </div>
            <Switch
              checked={showStations}
              onCheckedChange={setShowStations}
              aria-label="Mostrar estacoes"
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Veiculos
          </span>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Mostrar parados</p>
              <p className="text-[11px] text-muted-foreground">
                Exibe veiculos com velocidade igual a zero.
              </p>
            </div>
            <Switch
              checked={showStoppedVehicles}
              onCheckedChange={onShowStoppedVehiclesChange}
              aria-label="Mostrar veiculos parados"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full" style={{ background: "#10b981" }}></span>
              <span className="text-foreground">Em movimento</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-full" style={{ background: "#f59e0b" }}></span>
              <span className="text-foreground">Parado</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="relative h-3 w-3 rounded-full" style={{ background: "#3b82f6" }}>
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-white bg-emerald-500"></span>
              </span>
              <span className="text-foreground">Na estacao</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Corredores
          </span>
          <div className="flex flex-col gap-1">
            {corredorLegend.map((corredor) => (
              <div key={corredor.nome} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full" style={{ background: corredor.stroke }}></span>
                <span className="text-foreground">{corredor.nome}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
