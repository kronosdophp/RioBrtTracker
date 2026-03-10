"use client"

import { MapPin, Navigation, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Veiculo } from "@/lib/types"
import { haversineKm, estimarChegada, formatDistancia } from "@/lib/geo-utils"

interface NearbyPanelProps {
  veiculos: Veiculo[]
  userLocation: { lat: number; lng: number } | null
  isLocating: boolean
  onRequestLocation: () => void
  onSelectVeiculo: (id: string) => void
}

interface NearbyBus {
  veiculo: Veiculo
  distKm: number
  eta: string
  id: string
}

export function NearbyPanel({
  veiculos,
  userLocation,
  isLocating,
  onRequestLocation,
  onSelectVeiculo,
}: NearbyPanelProps) {
  if (!userLocation) {
    return (
      <div className="rounded-lg border border-border bg-secondary/50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-foreground">
            Onibus perto de voce
          </span>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Ative sua localizacao para ver os onibus mais proximos e previsao de
          chegada.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRequestLocation}
          disabled={isLocating}
          className="w-full text-xs"
        >
          <Navigation className="mr-1.5 h-3 w-3" />
          {isLocating ? "Obtendo localizacao..." : "Ativar localizacao"}
        </Button>
      </div>
    )
  }

  // Find 3 closest moving buses
  const nearby: NearbyBus[] = veiculos
    .filter((v) => {
      const lat = Number(v.latitude)
      const lng = Number(v.longitude)
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
    })
    .map((v) => {
      const lat = Number(v.latitude)
      const lng = Number(v.longitude)
      const vel = Number(v.velocidade) || 0
      const dist = haversineKm(lat, lng, userLocation.lat, userLocation.lng)
      const eta = estimarChegada(lat, lng, vel, userLocation.lat, userLocation.lng)
      return {
        veiculo: v,
        distKm: dist,
        eta: eta.texto,
        id: v.id || v.veiculo || "",
      }
    })
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 3)

  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-foreground">
            Mais proximos
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {nearby.map((n) => {
          const vel = Number(n.veiculo.velocidade) || 0
          const isMoving = vel > 0

          return (
            <button
              key={n.id}
              onClick={() => onSelectVeiculo(n.id)}
              className="flex items-center gap-3 rounded-md bg-card/60 p-2 text-left transition-colors hover:bg-card"
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  background: isMoving ? "#059669" : "#d97706",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect
                    x="4"
                    y="3"
                    width="16"
                    height="14"
                    rx="2"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <line
                    x1="4"
                    y1="9"
                    x2="20"
                    y2="9"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <circle cx="8" cy="19" r="1.5" fill="white" />
                  <circle cx="16" cy="19" r="1.5" fill="white" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {n.veiculo.veiculo}
                  </span>
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                    L{n.veiculo.linha}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistancia(n.distKm)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-primary">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono text-xs font-bold">
                    {n.eta}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {vel} km/h
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
