"use client"

import { Bus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { StatsPanel } from "./stats-panel"
import { LineFilter } from "./line-filter"
import { VehicleList } from "./vehicle-list"
import { ConnectionStatus } from "./connection-status"
import { NearbyPanel } from "./nearby-panel"
import type { DashboardStats, Veiculo } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SidebarProps {
  stats: DashboardStats
  veiculos: Veiculo[]
  selectedId: string | null
  selectedLinha: string
  showStoppedVehicles: boolean
  isLoading: boolean
  isValidating: boolean
  isConnected: boolean
  lastUpdate: Date | null
  collapsed: boolean
  userLocation: { lat: number; lng: number } | null
  isLocating: boolean
  onSelectVeiculo: (id: string) => void
  onLinhaChange: (linha: string) => void
  onRefresh: () => void
  onToggleCollapse: () => void
  onRequestLocation: () => void
  onShowStoppedVehiclesChange: (checked: boolean) => void
}

export function Sidebar({
  stats,
  veiculos,
  selectedId,
  selectedLinha,
  showStoppedVehicles,
  isLoading,
  isValidating,
  isConnected,
  lastUpdate,
  collapsed,
  userLocation,
  isLocating,
  onSelectVeiculo,
  onLinhaChange,
  onRefresh,
  onToggleCollapse,
  onRequestLocation,
  onShowStoppedVehiclesChange,
}: SidebarProps) {
  const filteredVeiculos =
    selectedLinha === "all"
      ? veiculos.filter((v) => showStoppedVehicles || (Number(v.velocidade) || 0) > 0)
      : veiculos.filter(
          (v) =>
            v.linha === selectedLinha &&
            (showStoppedVehicles || (Number(v.velocidade) || 0) > 0)
        )

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
            <Bus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              BRT Rio Monitor
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Rastreamento em tempo real
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Abrir painel" : "Fechar painel"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
        <ConnectionStatus
          isConnected={isConnected}
          isValidating={isValidating}
          lastUpdate={lastUpdate}
          onRefresh={onRefresh}
        />

        <StatsPanel stats={stats} isLoading={isLoading} />

        <NearbyPanel
          veiculos={veiculos}
          userLocation={userLocation}
          isLocating={isLocating}
          onRequestLocation={onRequestLocation}
          onSelectVeiculo={onSelectVeiculo}
        />

        <Separator className="bg-border" />

        <LineFilter
          linhas={stats.linhas}
          selectedLinha={selectedLinha}
          onLinhaChange={onLinhaChange}
        />

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Exibir parados
            </p>
            <p className="text-[11px] text-muted-foreground">
              Mostra ou oculta os veiculos sem movimento.
            </p>
          </div>
          <Switch
            checked={showStoppedVehicles}
            onCheckedChange={onShowStoppedVehiclesChange}
            aria-label="Mostrar veiculos parados"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Veiculos ({filteredVeiculos.length})
          </span>
        </div>

        <VehicleList
          veiculos={filteredVeiculos}
          selectedId={selectedId}
          onSelect={onSelectVeiculo}
          isLoading={isLoading}
          className="min-h-0 flex-1"
        />
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2">
        <p className="text-center text-[10px] text-muted-foreground">
          Dados: KronosSystem
        </p>
      </div>
    </>
  )

  // Desktop: Show as fixed sidebar
  return (
    <div className="relative z-[1200] hidden h-full shrink-0 md:block">
      <aside
        className={cn(
          "relative flex h-full flex-col overflow-hidden border-r border-border bg-card transition-[width,border-color] duration-300",
          collapsed ? "w-0 border-r-transparent" : "w-[360px]"
        )}
      >
        {!collapsed && sidebarContent}
      </aside>

      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="absolute left-full top-3 z-50 h-9 w-9 rounded-l-none rounded-r-lg border border-l-0 border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          aria-label="Abrir painel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
