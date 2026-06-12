import { Card } from '../ui/Card'
import { formatBRL } from '../../lib/clipboard'
import type { PorDataRow } from '../../types'

interface PorDataTableProps {
  rows: PorDataRow[]
  loading: boolean
  selectedPlayerId: string | null
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export function PorDataTable({ rows, loading, selectedPlayerId }: PorDataTableProps) {
  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>
  if (rows.length === 0) return <div className="p-8 text-center text-zinc-500">Nenhum dado encontrado.</div>

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const playerData = selectedPlayerId
          ? row.players.find((p) => p.player_id === selectedPlayerId)
          : null

        return (
          <Card key={row.bet_date} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-100">{formatDate(row.bet_date)}</span>
              <span className="text-xs text-zinc-500">{row.bet_count} bet{row.bet_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
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
