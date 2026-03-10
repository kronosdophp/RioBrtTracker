export interface Veiculo {
  id: string | null
  veiculo: string | null
  linha: string | null
  latitude: number | null
  longitude: number | null
  velocidade: number | null
  sentido: string | null
  datahora: string | null
  trajeto: string | null
  ignicao: boolean | null
  direcao: number | null
  placa: string | null
  timestamp: number
}

export interface DashboardStats {
  total: number
  emMovimento: number
  parados: number
  linhasAtivas: number
  linhas: string[]
}

export function calcularStats(veiculos: Veiculo[]): DashboardStats {
  const emMovimento = veiculos.filter(
    (v) => (Number(v.velocidade) || 0) > 0
  ).length
  const linhasSet = new Set(
    veiculos.map((v) => v.linha).filter((l): l is string => !!l)
  )

  return {
    total: veiculos.length,
    emMovimento,
    parados: veiculos.length - emMovimento,
    linhasAtivas: linhasSet.size,
    linhas: Array.from(linhasSet).sort(),
  }
}
