import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatBRL } from '../../lib/clipboard'
import type { PorEventoRow } from '../../types'

interface PorEventoTableProps {
  rows: PorEventoRow[]
  loading: boolean
  selectedPlayerId: string | null
}

export function PorEventoTable({ rows, loading, selectedPlayerId }: PorEventoTableProps) {
  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>
  if (rows.length === 0) return <div className="p-8 text-center text-zinc-500">Nenhum dado encontrado.</div>

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const key = `${row.sport}-${row.event_label ?? 'none'}`
        const playerData = selectedPlayerId
          ? row.players.find((p) => p.player_id === selectedPlayerId)
          : null

        return (
          <Card key={key} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge sport={row.sport} />
              {row.event_label && (
                <span className="text-zinc-300 text-sm font-medium">{row.event_label}</span>
              )}
              <span className="text-zinc-500 text-xs ml-auto">{row.bet_count} bet{row.bet_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-zinc-500 text-xs">Investido</p>
                <p className="font-mono tabular-nums text-zinc-200">
                  R$ {(playerData ? playerData.buyin : row.group_buyin).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Retorno</p>
                <p className="font-mono tabular-nums text-zinc-200">
                  R$ {(playerData ? playerData.payout : row.group_payout).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Lucro</p>
                <p className={`font-mono tabular-nums font-semibold ${
                  (playerData ? playerData.net : row.group_net) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatBRL(playerData ? playerData.net : row.group_net)}
                </p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
