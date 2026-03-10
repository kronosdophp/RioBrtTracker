import useSWR from "swr"
import type { Veiculo } from "@/lib/types"

const fetcher = async (url: string): Promise<Veiculo[]> => {
  const res = await fetch(url)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Erro HTTP: ${res.status}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export function useVeiculos(refreshInterval = 20000) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Veiculo[]>(
    "/api/veiculos",
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 10000,
    }
  )

  return {
    veiculos: data || [],
    error,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  }
}
