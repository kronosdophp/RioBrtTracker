"use client"

import { cn } from "@/lib/utils"
import { RefreshCw, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConnectionStatusProps {
  isConnected: boolean
  isValidating: boolean
  lastUpdate: Date | null
  onRefresh: () => void
}

export function ConnectionStatus({
  isConnected,
  isValidating,
  lastUpdate,
  onRefresh,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isConnected ? (
          <Wifi className="h-3.5 w-3.5 text-primary" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-destructive" />
        )}
        <span>
          {lastUpdate
            ? `${lastUpdate.toLocaleTimeString("pt-BR")}`
            : "Aguardando..."}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isValidating}
        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <RefreshCw
          className={cn("h-3 w-3", isValidating && "animate-spin")}
        />
        {isValidating ? "Atualizando" : "Atualizar"}
      </Button>
    </div>
  )
}
