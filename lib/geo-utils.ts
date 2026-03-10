/**
 * Utilitarios de geolocalizacao e calculo de distancia/previsao.
 */

/** Calcula a distancia em km entre dois pontos (Haversine) */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Formata distancia para exibicao */
export function formatDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/**
 * Estima o tempo de chegada do onibus ate um ponto (sua localizacao).
 * Retorna string legivel ("~5 min", "~12 min", etc.)
 * Se o onibus estiver parado, retorna estimativa baseada na velocidade media do BRT (~25km/h).
 */
export function estimarChegada(
  busLat: number,
  busLng: number,
  busVelocidade: number,
  destLat: number,
  destLng: number
): { distanciaKm: number; minutos: number; texto: string } {
  const dist = haversineKm(busLat, busLng, destLat, destLng)

  // Fator de correcao: distancia em linha reta -> distancia via ruas (~1.4x)
  const distReal = dist * 1.4

  // Velocidade: usa a atual se > 5 km/h, senao usa media do BRT
  const vel = busVelocidade > 5 ? busVelocidade : 25

  const horas = distReal / vel
  const minutos = Math.round(horas * 60)

  let texto: string
  if (minutos < 1) {
    texto = "< 1 min"
  } else if (minutos > 120) {
    texto = "> 2h"
  } else {
    texto = `~${minutos} min`
  }

  return { distanciaKm: dist, minutos, texto }
}
