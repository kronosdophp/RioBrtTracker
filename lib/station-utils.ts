/**
 * Utilitários para detecção de proximidade de estações BRT
 * usando dados reais do GeoJSON
 */

import { haversineKm } from "./geo-utils"

export interface StationGeoJSON {
  Nome: string
  Flg_TransCarioca: number
  Flg_TransBrasil: number
  Flg_TransOeste: number
  Flg_TransOlimpica: number
  Integra_Trem: number
  Integra_Metro: number
  Integra_Aeroporto: number
}

export interface StationFeature {
  type: "Feature"
  properties: StationGeoJSON
  geometry: {
    type: "Point"
    coordinates: [number, number] // [lng, lat]
  }
}

export interface NearbyStation {
  nome: string
  distanciaKm: number
  corredor: string
  corCorredor: string
  integracoes: string[]
  status: "na_estacao" | "aproximando" | "proximo"
}

// Cores para cada corredor BRT
const corredorCores: Record<string, string> = {
  "Transcarioca": "#3b82f6",
  "Transolímpica": "#10b981", 
  "Transoeste": "#f59e0b",
  "Lote Zero": "#8b5cf6",
  "Transbrasil": "#ef4444",
}

// Distâncias em km para determinar o status
const DISTANCIA_NA_ESTACAO = 0.05 // 50 metros
const DISTANCIA_APROXIMANDO = 0.3 // 300 metros
const DISTANCIA_PROXIMO = 0.8 // 800 metros

// Cache das estações carregadas
let stationsCache: StationFeature[] | null = null

/**
 * Carrega as estações do arquivo GeoJSON
 */
export async function loadStations(): Promise<StationFeature[]> {
  if (stationsCache) {
    return stationsCache
  }

  try {
    const response = await fetch("/data/brt_stations.geojson")
    const data = await response.json()
    stationsCache = data.features
    return stationsCache || []
  } catch (error) {
    console.error("[v0] Erro ao carregar estações:", error)
    return []
  }
}

/**
 * Determina o corredor principal de uma estação
 */
export function getCorredorFromStation(props: StationGeoJSON): string {
  if (props.Flg_TransCarioca) return "Transcarioca"
  if (props.Flg_TransBrasil) return "Transbrasil"
  if (props.Flg_TransOeste) return "Transoeste"
  if (props.Flg_TransOlimpica) return "Transolímpica"
  return "Desconhecido"
}

/**
 * Verifica se uma estação pertence a um corredor específico
 */
export function stationMatchesCorredor(props: StationGeoJSON, corredorTrajeto: string | null): boolean {
  if (!corredorTrajeto) return true // Se não sabemos o corredor, aceita qualquer estação
  
  const c = corredorTrajeto.toLowerCase()
  
  if (c.includes("transoeste") && props.Flg_TransOeste) return true
  if (c.includes("transcarioca") && props.Flg_TransCarioca) return true
  if ((c.includes("transolimpica") || c.includes("transolímpica")) && props.Flg_TransOlimpica) return true
  if (c.includes("transbrasil") && props.Flg_TransBrasil) return true
  
  return false
}

/**
 * Encontra a estação mais próxima de um veículo
 */
export function findNearestStation(
  lat: number, 
  lng: number, 
  stations: StationFeature[],
  corredorTrajeto?: string | null
): NearbyStation | null {
  if (stations.length === 0) return null

  let nearestStation: StationFeature | null = null
  let minDistance = Infinity

  for (const station of stations) {
    // Se temos o corredor do trajeto, filtra apenas estações desse corredor
    if (corredorTrajeto && !stationMatchesCorredor(station.properties, corredorTrajeto)) {
      continue
    }

    const [stationLng, stationLat] = station.geometry.coordinates
    const distance = haversineKm(lat, lng, stationLat, stationLng)

    if (distance < minDistance) {
      minDistance = distance
      nearestStation = station
    }
  }

  if (!nearestStation || minDistance > DISTANCIA_PROXIMO) {
    return null
  }

  const props = nearestStation.properties
  const corredor = getCorredorFromStation(props)
  
  // Determina integrações
  const integracoes: string[] = []
  if (props.Integra_Trem) integracoes.push("Trem")
  if (props.Integra_Metro) integracoes.push("Metrô")
  if (props.Integra_Aeroporto) integracoes.push("Aeroporto")

  // Determina status baseado na distância
  let status: NearbyStation["status"]
  if (minDistance <= DISTANCIA_NA_ESTACAO) {
    status = "na_estacao"
  } else if (minDistance <= DISTANCIA_APROXIMANDO) {
    status = "aproximando"
  } else {
    status = "proximo"
  }

  return {
    nome: props.Nome,
    distanciaKm: minDistance,
    corredor,
    corCorredor: corredorCores[corredor] || "#6b7280",
    integracoes,
    status,
  }
}

/**
 * Retorna texto de status para exibição
 */
export function getStatusText(status: NearbyStation["status"]): string {
  switch (status) {
    case "na_estacao":
      return "Na estação"
    case "aproximando":
      return "Aproximando"
    case "proximo":
      return "Próximo"
  }
}

/**
 * Retorna cor do status
 */
export function getStatusColor(status: NearbyStation["status"]): string {
  switch (status) {
    case "na_estacao":
      return "#10b981" // verde
    case "aproximando":
      return "#f59e0b" // amarelo
    case "proximo":
      return "#6b7280" // cinza
  }
}
