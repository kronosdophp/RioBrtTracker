"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LineFilterProps {
  linhas: string[]
  selectedLinha: string
  onLinhaChange: (linha: string) => void
}

export function LineFilter({
  linhas,
  selectedLinha,
  onLinhaChange,
}: LineFilterProps) {
  return (
    <Select value={selectedLinha} onValueChange={onLinhaChange}>
      <SelectTrigger className="w-full bg-secondary/50 border-border text-foreground">
        <SelectValue placeholder="Todas as linhas" />
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        <SelectItem value="all">Todas as linhas</SelectItem>
        {linhas.map((linha) => (
          <SelectItem key={linha} value={linha}>
            Linha {linha}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
