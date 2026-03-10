

export interface Estacao {
  nome: string
  lat: number
  lng: number
}

export interface CorredorBRT {
  nome: string
  cor: string
  estacoes: Estacao[]
}

// Corredores do BRT com estacoes em ordem
export const corredores: Record<string, CorredorBRT> = {
  transoeste: {
    nome: "TransOeste",
    cor: "#e63946",
    estacoes: [
      { nome: "Santa Cruz", lat: -22.9136, lng: -43.6753 },
      { nome: "Benjamin do Monte", lat: -22.9112, lng: -43.6621 },
      { nome: "Cesarao III", lat: -22.9126, lng: -43.6484 },
      { nome: "Cesarao II", lat: -22.9141, lng: -43.6375 },
      { nome: "Cesarao I", lat: -22.9139, lng: -43.6275 },
      { nome: "Pingo D'agua", lat: -22.9136, lng: -43.6110 },
      { nome: "Vila Militar Sulacap", lat: -22.9128, lng: -43.5989 },
      { nome: "Cosmos", lat: -22.9118, lng: -43.5888 },
      { nome: "Inhoaiba", lat: -22.9069, lng: -43.5590 },
      { nome: "Prefeito Alim Pedro", lat: -22.9020, lng: -43.5463 },
      { nome: "Curral Falso", lat: -22.8998, lng: -43.5349 },
      { nome: "Santa Veridiana", lat: -22.8988, lng: -43.5163 },
      { nome: "Campo Grande", lat: -22.9002, lng: -43.5564 },
      { nome: "Mato Alto", lat: -22.9178, lng: -43.4780 },
      { nome: "Recreio Shopping", lat: -22.9768, lng: -43.3874 },
      { nome: "Guimaraes", lat: -22.9789, lng: -43.3783 },
      { nome: "Recanto das Palmeiras", lat: -22.9796, lng: -43.3685 },
      { nome: "Recreio Bandeirantes", lat: -22.9790, lng: -43.3556 },
      { nome: "Pontoes/Barra Grill", lat: -22.9874, lng: -43.3377 },
      { nome: "Gilka Machado", lat: -22.9930, lng: -43.3244 },
      { nome: "Americas Park", lat: -22.9966, lng: -43.3145 },
      { nome: "Santa Monica/Jardim Oceanico", lat: -22.9988, lng: -43.3068 },
      { nome: "Bosque da Barra/Carrefour", lat: -22.9933, lng: -43.3596 },
      { nome: "Salvador Allende", lat: -22.9753, lng: -43.3965 },
      { nome: "Alvorada", lat: -22.9873, lng: -43.3010 },
    ],
  },
  transcarioca: {
    nome: "TransCarioca",
    cor: "#457b9d",
    estacoes: [
      { nome: "Alvorada", lat: -22.9873, lng: -43.3010 },
      { nome: "Aroldo Melodia/Cidade de Deus", lat: -22.9502, lng: -43.3475 },
      { nome: "Minha Praia", lat: -22.9337, lng: -43.3480 },
      { nome: "Divina Providencia", lat: -22.9301, lng: -43.3411 },
      { nome: "PUC-Rio/Gavea", lat: -22.9261, lng: -43.3308 },
      { nome: "Curicica", lat: -22.9493, lng: -43.3608 },
      { nome: "Taquara", lat: -22.9224, lng: -43.3772 },
      { nome: "Tanque", lat: -22.9109, lng: -43.3655 },
      { nome: "Praça Seca", lat: -22.8945, lng: -43.3451 },
      { nome: "Vila Valqueire", lat: -22.8850, lng: -43.3374 },
      { nome: "Magalhaes Bastos", lat: -22.8757, lng: -43.3915 },
      { nome: "Vila Militar", lat: -22.8632, lng: -43.3919 },
      { nome: "Marechal Hermes", lat: -22.8549, lng: -43.3696 },
      { nome: "Rocha Miranda", lat: -22.8518, lng: -43.3412 },
      { nome: "Mercadao de Madureira", lat: -22.8622, lng: -43.3379 },
      { nome: "Manaceia", lat: -22.8529, lng: -43.3232 },
      { nome: "Vaz Lobo", lat: -22.8494, lng: -43.3089 },
      { nome: "Irai", lat: -22.8430, lng: -43.2910 },
      { nome: "Vicente de Carvalho", lat: -22.8392, lng: -43.2785 },
      { nome: "Penha I", lat: -22.8356, lng: -43.2612 },
      { nome: "Penha II", lat: -22.8418, lng: -43.2597 },
      { nome: "Olaria", lat: -22.8460, lng: -43.2544 },
      { nome: "Fundao", lat: -22.8574, lng: -43.2304 },
      { nome: "Galeao - Tom Jobim", lat: -22.8089, lng: -43.2497 },
    ],
  },
  transolimpica: {
    nome: "TransOlimpica",
    cor: "#f4a261",
    estacoes: [
      { nome: "Recreio Shopping", lat: -22.9768, lng: -43.3874 },
      { nome: "Centro Metropolitano", lat: -22.9621, lng: -43.3968 },
      { nome: "Sulacap", lat: -22.8965, lng: -43.3713 },
      { nome: "Vila Militar", lat: -22.8632, lng: -43.3919 },
      { nome: "Magalhaes Bastos", lat: -22.8757, lng: -43.3915 },
      { nome: "Deodoro", lat: -22.8575, lng: -43.3880 },
    ],
  },
}

// Mapeamento de linhas para corredores (baseado no nome do trajeto)
export function getCorredorFromTrajeto(trajeto: string | null): string | null {
  if (!trajeto) return null
  const t = trajeto.toUpperCase()

  if (t.includes("SANTA CRUZ") || t.includes("ALVORADA") || t.includes("CAMPO GRANDE") || t.includes("RECREIO")) {
    return "transoeste"
  }
  if (t.includes("GALEAO") || t.includes("FUNDAO") || t.includes("PENHA") || t.includes("MADUREIRA") || t.includes("VICENTE")) {
    return "transcarioca"
  }
  if (t.includes("DEODORO") || t.includes("SULACAP") || t.includes("CENTRO METROPOLITANO")) {
    return "transolimpica"
  }

  return null
}

// Encontra a estacao mais proxima de um ponto
function distancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getEstacaoMaisProxima(
  lat: number,
  lng: number,
  corredor: CorredorBRT
): { estacao: Estacao; index: number; distKm: number } {
  let minDist = Infinity
  let minIndex = 0

  corredor.estacoes.forEach((est, i) => {
    const d = distancia(lat, lng, est.lat, est.lng)
    if (d < minDist) {
      minDist = d
      minIndex = i
    }
  })

  return {
    estacao: corredor.estacoes[minIndex],
    index: minIndex,
    distKm: minDist,
  }
}

// Calcula previsao de chegada baseado na velocidade e distancia restante
export function calcularPrevisaoChegada(
  lat: number,
  lng: number,
  velocidade: number,
  corredor: CorredorBRT,
  sentido: string | null
): {
  estacaoAtual: Estacao
  proximaEstacao: Estacao | null
  destino: Estacao
  distanciaRestanteKm: number
  tempoEstimadoMin: number | null
  estacoesFaltando: number
  rota: Estacao[] // estacoes restantes ate o destino
} {
  const { estacao: estacaoAtual, index } = getEstacaoMaisProxima(lat, lng, corredor)

  // Determina direcao: ida = inicio->fim, volta = fim->inicio
  const isIda = sentido ? sentido.toLowerCase().includes("ida") : true
  const destino = isIda
    ? corredor.estacoes[corredor.estacoes.length - 1]
    : corredor.estacoes[0]

  // Estacoes restantes ate o destino
  let rota: Estacao[]
  let proximaEstacao: Estacao | null

  if (isIda) {
    rota = corredor.estacoes.slice(index + 1)
    proximaEstacao = index < corredor.estacoes.length - 1 ? corredor.estacoes[index + 1] : null
  } else {
    rota = corredor.estacoes.slice(0, index).reverse()
    proximaEstacao = index > 0 ? corredor.estacoes[index - 1] : null
  }

  // Calcula distancia total restante
  let distanciaRestanteKm = 0
  let prevLat = lat
  let prevLng = lng

  for (const est of rota) {
    distanciaRestanteKm += distancia(prevLat, prevLng, est.lat, est.lng)
    prevLat = est.lat
    prevLng = est.lng
  }

  // Tempo estimado em minutos (se velocidade > 0)
  const tempoEstimadoMin =
    velocidade > 0 ? Math.round((distanciaRestanteKm / velocidade) * 60) : null

  return {
    estacaoAtual,
    proximaEstacao,
    destino,
    distanciaRestanteKm: Math.round(distanciaRestanteKm * 10) / 10,
    tempoEstimadoMin,
    estacoesFaltando: rota.length,
    rota: [estacaoAtual, ...rota],
  }
}
