
export interface Estacao {
  nome: string
  lat: number
  lng: number
}

export interface Corredor {
  nome: string
  cor: string
  estacoes: Estacao[]
}

export const corredores: Record<string, Corredor> = {
  transoeste: {
    nome: "TransOeste",
    cor: "#f59e0b",
    estacoes: [
      { nome: "Terminal Jardim Oceanico", lat: -22.9875, lng: -43.3652 },
      { nome: "Bosque Marapendi", lat: -22.9931, lng: -43.3628 },
      { nome: "Paulo Malta Resende", lat: -22.9965, lng: -43.3589 },
      { nome: "Afranio Costa", lat: -22.9998, lng: -43.3562 },
      { nome: "Riviera", lat: -23.0012, lng: -43.3500 },
      { nome: "Ricardo Marinho", lat: -23.0018, lng: -43.3445 },
      { nome: "Parque das Rosas", lat: -23.0015, lng: -43.3370 },
      { nome: "Barra Shopping", lat: -23.0000, lng: -43.3200 },
      { nome: "Terminal Alvorada", lat: -22.9986, lng: -43.3060 },
      { nome: "Bosque da Barra", lat: -23.0020, lng: -43.3150 },
      { nome: "Novo Leblon", lat: -23.0060, lng: -43.3200 },
      { nome: "Americas Park", lat: -23.0095, lng: -43.3270 },
      { nome: "Santa Monica Jardins", lat: -23.0120, lng: -43.3340 },
      { nome: "Riomar", lat: -23.0140, lng: -43.3400 },
      { nome: "Golfe Olimpico", lat: -23.0165, lng: -43.3490 },
      { nome: "Interlagos", lat: -23.0190, lng: -43.3540 },
      { nome: "Pedra de Itauna", lat: -23.0210, lng: -43.3610 },
      { nome: "Pontoes/Barrasul", lat: -23.0220, lng: -43.3680 },
      { nome: "Salvador Allende", lat: -23.0200, lng: -43.3810 },
      { nome: "Gelson Fonseca", lat: -23.0190, lng: -43.3880 },
      { nome: "Guignard", lat: -23.0182, lng: -43.3950 },
      { nome: "Glaucio Gil", lat: -23.0170, lng: -43.4020 },
      { nome: "Benvindo Novaes", lat: -23.0160, lng: -43.4100 },
      { nome: "Nova Barra", lat: -23.0150, lng: -43.4180 },
      { nome: "Gilka Machado", lat: -23.0135, lng: -43.4250 },
      { nome: "Guiomar Novaes", lat: -23.0120, lng: -43.4330 },
      { nome: "Recreio Shopping", lat: -23.0100, lng: -43.4400 },
      { nome: "Recanto das Garcas", lat: -23.0075, lng: -43.4480 },
      { nome: "Notre Dame", lat: -23.0050, lng: -43.4540 },
      { nome: "Dom Bosco", lat: -23.0030, lng: -43.4610 },
      { nome: "Pontal", lat: -23.0010, lng: -43.4700 },
      { nome: "Ilha de Guaratiba", lat: -23.0020, lng: -43.4900 },
      { nome: "CTEx", lat: -22.9990, lng: -43.5060 },
      { nome: "Embrapa", lat: -22.9930, lng: -43.5150 },
      { nome: "Mato Alto", lat: -22.9830, lng: -43.5250 },
      { nome: "Magarca", lat: -22.9770, lng: -43.5370 },
      { nome: "Pingo D'agua", lat: -22.9700, lng: -43.5460 },
      { nome: "Vendas de Varanda", lat: -22.9610, lng: -43.5530 },
      { nome: "Santa Veridiana", lat: -22.9540, lng: -43.5590 },
      { nome: "Curral Falso", lat: -22.9460, lng: -43.5640 },
      { nome: "Cajueiros", lat: -22.9380, lng: -43.5690 },
      { nome: "Gastao Rangel", lat: -22.9310, lng: -43.5750 },
      { nome: "General Olimpio", lat: -22.9240, lng: -43.5790 },
      { nome: "Terminal Santa Cruz", lat: -22.9132, lng: -43.5830 },
    ],
  },
  transcarioca: {
    nome: "TransCarioca",
    cor: "#3b82f6",
    estacoes: [
      { nome: "Terminal Alvorada", lat: -22.9986, lng: -43.3060 },
      { nome: "Lourenco Jorge", lat: -22.9980, lng: -43.2980 },
      { nome: "Aeroporto de Jacarepagua", lat: -22.9890, lng: -43.2910 },
      { nome: "Via Parque", lat: -22.9810, lng: -43.2830 },
      { nome: "Centro Metropolitano", lat: -22.9750, lng: -43.2720 },
      { nome: "Rede Sarah", lat: -22.9720, lng: -43.2660 },
      { nome: "Rio 2", lat: -22.9700, lng: -43.2570 },
      { nome: "Pedro Correia", lat: -22.9640, lng: -43.2490 },
      { nome: "Curicica", lat: -22.9580, lng: -43.2370 },
      { nome: "Praca do Bandolim", lat: -22.9530, lng: -43.2280 },
      { nome: "Arroio Pavuna", lat: -22.9490, lng: -43.2190 },
      { nome: "Vila Sape", lat: -22.9440, lng: -43.2110 },
      { nome: "Recanto das Palmeiras", lat: -22.9400, lng: -43.2030 },
      { nome: "Divina Providencia", lat: -22.9370, lng: -43.1970 },
      { nome: "Santa Efigenia", lat: -22.9340, lng: -43.1900 },
      { nome: "Merck", lat: -22.9310, lng: -43.1830 },
      { nome: "Andre Rocha", lat: -22.9280, lng: -43.1770 },
      { nome: "Taquara", lat: -22.9250, lng: -43.1710 },
      { nome: "Aracy Cabral", lat: -22.9220, lng: -43.1650 },
      { nome: "Tanque", lat: -22.9190, lng: -43.1590 },
      { nome: "IPASE", lat: -22.9150, lng: -43.1530 },
      { nome: "Praca Seca", lat: -22.9100, lng: -43.1460 },
      { nome: "Capitao Menezes", lat: -22.9050, lng: -43.1400 },
      { nome: "Pinto Teles", lat: -22.9000, lng: -43.1340 },
      { nome: "Campinho", lat: -22.8960, lng: -43.1280 },
      { nome: "Madureira", lat: -22.8740, lng: -43.3380 },
      { nome: "Mercadao", lat: -22.8700, lng: -43.3310 },
      { nome: "Otaviano", lat: -22.8660, lng: -43.3230 },
      { nome: "Vila Queiroz", lat: -22.8620, lng: -43.3150 },
      { nome: "Vaz Lobo", lat: -22.8580, lng: -43.3080 },
      { nome: "Marambaia", lat: -22.8530, lng: -43.2980 },
      { nome: "Vicente de Carvalho", lat: -22.8490, lng: -43.2910 },
      { nome: "Vila Kosmos", lat: -22.8450, lng: -43.2830 },
      { nome: "Pedro Taques", lat: -22.8410, lng: -43.2750 },
      { nome: "Praca do Carmo", lat: -22.8370, lng: -43.2680 },
      { nome: "Guapore", lat: -22.8340, lng: -43.2620 },
      { nome: "Pastor Jose Santos", lat: -22.8310, lng: -43.2550 },
      { nome: "Penha 1", lat: -22.8280, lng: -43.2480 },
      { nome: "Penha 2", lat: -22.8260, lng: -43.2430 },
      { nome: "Ibiapina", lat: -22.8230, lng: -43.2360 },
      { nome: "Olaria", lat: -22.8200, lng: -43.2290 },
      { nome: "Cardoso de Moraes", lat: -22.8170, lng: -43.2220 },
      { nome: "Santa Luzia", lat: -22.8540, lng: -43.2510 },
      { nome: "Mare", lat: -22.8490, lng: -43.2400 },
      { nome: "Terminal Fundao", lat: -22.8550, lng: -43.2260 },
      { nome: "Galeao - Tom Jobim", lat: -22.8103, lng: -43.2507 },
    ],
  },
  transolimpica: {
    nome: "TransOlimpica",
    cor: "#10b981",
    estacoes: [
      { nome: "Terminal Recreio", lat: -23.0080, lng: -43.4450 },
      { nome: "Catedral do Recreio", lat: -23.0050, lng: -43.4350 },
      { nome: "Tapebuias", lat: -23.0020, lng: -43.4270 },
      { nome: "Ilha Pura", lat: -22.9820, lng: -43.3870 },
      { nome: "Olof Palme", lat: -22.9780, lng: -43.3770 },
      { nome: "RioCentro", lat: -22.9760, lng: -43.3680 },
      { nome: "Morro do Outeiro", lat: -22.9720, lng: -43.3600 },
      { nome: "Minha Praia", lat: -22.9550, lng: -43.3420 },
      { nome: "Asa Branca", lat: -22.9390, lng: -43.3350 },
      { nome: "Leila Diniz", lat: -22.9260, lng: -43.3300 },
      { nome: "Ventura", lat: -22.9140, lng: -43.3240 },
      { nome: "Colonia", lat: -22.8990, lng: -43.3510 },
      { nome: "Outeiro Santo", lat: -22.8880, lng: -43.3560 },
      { nome: "Boiuna", lat: -22.8760, lng: -43.3600 },
      { nome: "Marechal Fontenelle", lat: -22.8680, lng: -43.3680 },
      { nome: "Padre Joao Chribbin", lat: -22.8630, lng: -43.3770 },
      { nome: "Sao Jose de Magalhaes Bastos", lat: -22.8600, lng: -43.3880 },
      { nome: "Vila Militar", lat: -22.8580, lng: -43.3960 },
      { nome: "Terminal Deodoro", lat: -22.8566, lng: -43.3868 },
    ],
  },
  transbrasil: {
    nome: "TransBrasil",
    cor: "#ef4444",
    estacoes: [
      { nome: "Terminal Deodoro", lat: -22.8566, lng: -43.3868 },
      { nome: "Guadalupe", lat: -22.8550, lng: -43.3730 },
      { nome: "Jardim Guadalupe", lat: -22.8520, lng: -43.3630 },
      { nome: "CEASA Iraja", lat: -22.8400, lng: -43.3400 },
      { nome: "Terminal Margaridas", lat: -22.8350, lng: -43.3300 },
      { nome: "Vigario Geral", lat: -22.8270, lng: -43.3150 },
      { nome: "Cidade Alta", lat: -22.8240, lng: -43.3040 },
      { nome: "Terminal Missoes", lat: -22.8200, lng: -43.2900 },
      { nome: "Mercado Sao Sebastiao", lat: -22.8170, lng: -43.2800 },
      { nome: "Lobo Junior", lat: -22.8490, lng: -43.2650 },
      { nome: "Piscinao de Ramos", lat: -22.8410, lng: -43.2580 },
      { nome: "Rubens Vaz", lat: -22.8370, lng: -43.2530 },
      { nome: "Baixa do Sapateiro", lat: -22.8350, lng: -43.2480 },
      { nome: "Hospital de Bonsucesso", lat: -22.8530, lng: -43.2370 },
      { nome: "Fiocruz", lat: -22.8760, lng: -43.2440 },
      { nome: "Benfica", lat: -22.8870, lng: -43.2340 },
      { nome: "Vasco da Gama", lat: -22.8910, lng: -43.2280 },
      { nome: "INTO", lat: -22.8960, lng: -43.2200 },
      { nome: "Terminal Gentileza", lat: -22.8960, lng: -43.2070 },
    ],
  },
}

/**
 * Tenta mapear o trajeto de um veiculo ao corredor correto.
 * Busca keywords no campo "trajeto" da API.
 */
export function getCorredorFromTrajeto(trajeto?: string): string | null {
  if (!trajeto) return null
  const t = trajeto.toUpperCase()

  // TransOeste keywords
  if (
    t.includes("SANTA CRUZ") ||
    t.includes("CAMPO GRANDE") ||
    t.includes("ALVORADA") ||
    t.includes("RECREIO") ||
    t.includes("JARDIM OCEANIC") ||
    t.includes("SALVADOR ALLENDE") ||
    t.includes("MATO ALTO") ||
    t.includes("SANTA EUGENIA")
  )
    return "transoeste"

  // TransCarioca keywords
  if (
    t.includes("FUNDAO") ||
    t.includes("GALEAO") ||
    t.includes("MADUREIRA") ||
    t.includes("PENHA") ||
    t.includes("VICENTE") ||
    t.includes("TANQUE") ||
    t.includes("CAMPINHO")
  )
    return "transcarioca"

  // TransOlimpica keywords
  if (
    t.includes("DEODORO") ||
    t.includes("SULACAP") ||
    t.includes("OLIMPIC") ||
    t.includes("FONTENELLE")
  )
    return "transolimpica"

  // TransBrasil keywords
  if (
    t.includes("GENTILEZA") ||
    t.includes("GUADALUPE") ||
    t.includes("FIOCRUZ") ||
    t.includes("BENFICA")
  )
    return "transbrasil"

  return null
}

/**
 * Encontra a estacao mais proxima de um ponto.
 */
export function getEstacaoMaisProxima(
  lat: number,
  lng: number,
  corredor: Corredor
): { estacao: Estacao; index: number; distKm: number } {
  let minDist = Infinity
  let bestIdx = 0

  corredor.estacoes.forEach((e, i) => {
    const d = Math.sqrt((e.lat - lat) ** 2 + (e.lng - lng) ** 2) * 111
    if (d < minDist) {
      minDist = d
      bestIdx = i
    }
  })

  return {
    estacao: corredor.estacoes[bestIdx],
    index: bestIdx,
    distKm: minDist,
  }
}
