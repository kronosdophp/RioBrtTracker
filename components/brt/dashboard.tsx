"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { useVeiculos } from "@/hooks/use-veiculos"
import { calcularStats } from "@/lib/types"
import { Sidebar } from "./sidebar"
import { Loader2, Navigation } from "lucide-react"

const BRTMap = dynamic(
  () => import("./brt-map").then((mod) => ({ default: mod.BRTMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Carregando mapa...
          </span>
        </div>
      </div>
    ),
  }
)

export function Dashboard() {
  const { veiculos, error, isLoading, isValidating, refresh } =
    useVeiculos(20000)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedLinha, setSelectedLinha] = useState("all")
  const [collapsed, setCollapsed] = useState(false)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const lastUpdateRef = useRef<Date | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (veiculos.length > 0) {
      lastUpdateRef.current = new Date()
    }
  }, [veiculos])

  // Cleanup geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const stats = calcularStats(veiculos)

  const handleSelectVeiculo = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleLinhaChange = useCallback((linha: string) => {
    setSelectedLinha(linha)
    setSelectedId(null)
  }, [])

  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocalizacao nao suportada pelo seu navegador.")
      return
    }

    setIsLocating(true)

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setIsLocating(false)
      },
      (err) => {
        console.error("[v0] Geolocation error:", err)
        setIsLocating(false)
        alert(
          "Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador."
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )

    // Watch for updates
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    )
  }, [])

  const filteredVeiculos =
    selectedLinha === "all"
      ? veiculos
      : veiculos.filter((v) => v.linha === selectedLinha)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar
        stats={stats}
        veiculos={veiculos}
        selectedId={selectedId}
        selectedLinha={selectedLinha}
        isLoading={isLoading}
        isValidating={isValidating}
        isConnected={!error && veiculos.length > 0}
        lastUpdate={lastUpdateRef.current}
        collapsed={collapsed}
        userLocation={userLocation}
        isLocating={isLocating}
        onSelectVeiculo={handleSelectVeiculo}
        onLinhaChange={handleLinhaChange}
        onRefresh={refresh}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onRequestLocation={handleRequestLocation}
      />

      {/* Map Area */}
      <main className="relative flex-1">
        <BRTMap
          veiculos={filteredVeiculos}
          selectedId={selectedId}
          onSelectVeiculo={handleSelectVeiculo}
          userLocation={userLocation}
        />

        {/* Floating geolocation button on map */}
        {!userLocation && (
          <button
            onClick={handleRequestLocation}
            disabled={isLocating}
            className="absolute right-4 top-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all hover:bg-secondary disabled:opacity-50"
            title="Mostrar minha localizacao"
            aria-label="Ativar geolocalizacao"
          >
            <Navigation className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        {/* User location active indicator on map */}
        {userLocation && (
          <button
            onClick={handleRequestLocation}
            className="absolute right-4 top-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 shadow-lg transition-all hover:bg-blue-500/20"
            title="Localizacao ativa - clique para atualizar"
            aria-label="Atualizar geolocalizacao"
          >
            <Navigation className="h-5 w-5 text-blue-400" />
          </button>
        )}

        {/* Error Banner */}
        {error && (
          <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive backdrop-blur-sm">
              <p className="font-medium">Erro de conexao</p>
              <p className="text-xs opacity-80">
                {error.message || "Verifique se o backend C++ esta rodando"}
              </p>
            </div>
          </div>
        )}

        {/* Vehicles count overlay */}
        {!isLoading && veiculos.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            {selectedLinha !== "all"
              ? `Linha ${selectedLinha}: ${filteredVeiculos.length} veiculos`
              : `${veiculos.length} veiculos no mapa`}
          </div>
        )}
      </main>
    </div>
  )
}
