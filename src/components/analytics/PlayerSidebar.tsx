import { Card } from '../ui/Card'
import { formatBRL } from '../../lib/clipboard'
import type { Player } from '../../types'

interface PlayerSidebarProps {
  players: Player[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function PlayerSidebar({ players, loading, selectedId, onSelect }: PlayerSidebarProps) {
  if (loading) return <div className="w-48 shrink-0 text-zinc-500 text-sm p-4">Carregando...</div>

  return (
    <div className="w-full md:w-52 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible px-4 md:px-0 pb-2 md:pb-0">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 md:w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
          selectedId === null
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'text-zinc-400 hover:bg-zinc-800'
        }`}
      >
        Todos
      </button>
      {players.map((player) => (
        <Card
          key={player.id}
          onClick={() => onSelect(selectedId === player.id ? null : player.id)}
          className={`shrink-0 p-3 cursor-pointer transition-colors hover:border-amber-500/50 ${
            selectedId === player.id ? 'border-amber-500/50 bg-amber-500/5' : ''
          }`}
        >
          <p className="font-semibold text-zinc-100 text-sm">{player.name}</p>
          <p className={`text-xs font-mono tabular-nums mt-1 ${player.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatBRL(player.net_pnl)}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Saldo: R$ {player.balance.toFixed(2).replace('.', ',')}
          </p>
        </Card>
      ))}
    </div>
  )
}
