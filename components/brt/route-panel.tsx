"use client"

import { useMemo } from "react"
import { X, MapPin, Clock, Navigation, ArrowRight, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Veiculo } from "@/lib/types"
import {
  corredores,
  getCorredorFromTrajeto,
  calcularPrevisaoChegada,
} from "@/lib/brt-routes"

interface RoutePanelProps {
  veiculo: Veiculo
  onClose: () => void
}

export function RoutePanel({ veiculo, onClose }: RoutePanelProps) {
  const previsao = useMemo(() => {
    const corredorKey = getCorredorFromTrajeto(veiculo.trajeto)
    if (!corredorKey || !corredores[corredorKey]) return null

    const corredor = corredores[corredorKey]
    const lat = Number(veiculo.latitude)
    const lng = Number(veiculo.longitude)
    const vel = Number(veiculo.velocidade) || 0

    if (isNaN(lat) || isNaN(lng)) return null

    return {
      ...calcularPrevisaoChegada(lat, lng, vel, corredor, veiculo.sentido),
      corredor,
      corredorKey,
    }
  }, [veiculo])

  if (!previsao) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">
            Rota do Veiculo {veiculo.veiculo}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            aria-label="Fechar rota"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Rota nao disponivel para este trajeto.
        </p>
      </div>
    )
  }

  const isMoving = (Number(veiculo.velocidade) || 0) > 0

  return (
    <div className="flex flex-col gap-0 rounded-lg border border-border bg-card overflow-hidden">
      {/* Header com cor do corredor */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: previsao.corredor.cor + "22" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: previsao.corredor.cor }}
          />
          <span className="text-xs font-bold text-foreground">
            {previsao.corredor.nome}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Veiculo {veiculo.veiculo}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          aria-label="Fechar rota"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2.5 py-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">Proxima estacao</p>
            <p className="text-xs font-semibold text-foreground truncate">
              {previsao.proximaEstacao?.nome || "Destino final"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2.5 py-2">
          <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">Destino</p>
            <p className="text-xs font-semibold text-foreground truncate">
              {previsao.destino.nome}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2.5 py-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Chegada est.</p>
            <p className="text-xs font-semibold text-foreground">
              {previsao.tempoEstimadoMin !== null
                ? previsao.tempoEstimadoMin < 60
                  ? `${previsao.tempoEstimadoMin} min`
                  : `${Math.floor(previsao.tempoEstimadoMin / 60)}h ${previsao.tempoEstimadoMin % 60}min`
                : isMoving
                  ? "Calculando..."
                  : "Parado"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2.5 py-2">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Distancia</p>
            <p className="text-xs font-semibold text-foreground">
              {previsao.distanciaRestanteKm} km
              <span className="ml-1 text-muted-foreground font-normal">
                ({previsao.estacoesFaltando} paradas)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Timeline de estacoes */}
      <div className="border-t border-border px-3 py-2">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Rota restante
        </p>
        <div className="flex flex-col gap-0 max-h-[140px] overflow-y-auto pr-1">
          {previsao.rota.slice(0, 8).map((est, i) => {
            const isFirst = i === 0
            const isLast = i === previsao.rota.length - 1 || i === 7
            return (
              <div key={est.nome + i} className="flex items-center gap-2 relative">
                {/* Vertical line */}
                <div className="flex flex-col items-center w-4 shrink-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: isFirst
                        ? previsao.corredor.cor
                        : isLast
                          ? "#6b7280"
                          : previsao.corredor.cor + "80",
                      border: isFirst ? `2px solid ${previsao.corredor.cor}` : "none",
                      boxShadow: isFirst ? `0 0 0 3px ${previsao.corredor.cor}33` : "none",
                    }}
                  />
                  {!isLast && (
                    <div
                      className="w-px h-4"
                      style={{ background: previsao.corredor.cor + "40" }}
                    />
                  )}
                </div>

                <div className="flex items-center gap-1.5 py-0.5 min-w-0">
                  <span
                    className={`text-[11px] truncate ${
                      isFirst ? "font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {est.nome}
                  </span>
                  {isFirst && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold shrink-0">
                      AQUI
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {previsao.rota.length > 8 && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex flex-col items-center w-4">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                +{previsao.rota.length - 8} estacoes restantes
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
