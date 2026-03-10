"use client"

import { Bus, Activity, PauseCircle, Route } from "lucide-react"
import type { DashboardStats } from "@/lib/types"

interface StatsPanelProps {
  stats: DashboardStats
  isLoading: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight text-foreground font-mono">
          {value.toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  )
}

export function StatsPanel({ stats, isLoading }: StatsPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[68px] animate-pulse rounded-lg bg-secondary/50"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        icon={Bus}
        label="Total"
        value={stats.total}
        color="bg-accent/20 text-accent"
      />
      <StatCard
        icon={Activity}
        label="Em movimento"
        value={stats.emMovimento}
        color="bg-primary/20 text-primary"
      />
      <StatCard
        icon={PauseCircle}
        label="Parados"
        value={stats.parados}
        color="bg-warning/20 text-warning"
      />
      <StatCard
        icon={Route}
        label="Linhas ativas"
        value={stats.linhasAtivas}
        color="bg-chart-5/20 text-chart-5"
      />
    </div>
  )
}
