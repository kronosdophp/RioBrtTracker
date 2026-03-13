"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Gauge, Navigation } from "lucide-react"
import type { Veiculo } from "@/lib/types"

interface VehicleListProps {
  veiculos: Veiculo[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading: boolean
  className?: string
}

export function VehicleList({
  veiculos,
  selectedId,
  onSelect,
  isLoading,
  className,
}: VehicleListProps) {
  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-secondary/50"
          />
        ))}
      </div>
    )
  }

  if (veiculos.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center py-8 text-sm text-muted-foreground",
          className
        )}
      >
        Nenhum veiculo encontrado
      </div>
    )
  }

  return (
    <div className={cn("min-h-0 flex-1", className)}>
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1.5 pb-4 pr-3">
          {[...veiculos]
          .sort((a, b) => (a.linha || "").localeCompare(b.linha || ""))
          .map((v) => {
            const id = v.id || v.veiculo || ""
            const isMoving = (Number(v.velocidade) || 0) > 0
            const isSelected = selectedId === id

            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                  isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent bg-secondary/30 hover:bg-secondary/60"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    isMoving ? "bg-primary" : "bg-warning"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground font-mono">
                      {v.veiculo || "N/A"}
                    </span>
                    <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      Linha {v.linha || "?"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      {v.velocidade || 0} km/h
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      {v.sentido || "N/A"}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
