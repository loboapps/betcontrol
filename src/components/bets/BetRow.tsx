import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/Badge'
import type { Bet } from '../../types'

interface BetRowProps {
  bet: Bet
}

function formatBetDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

function statusLabel(bet: Bet): { text: string; className: string } {
  if (bet.gtd) return { text: 'GTD',  className: 'text-zinc-400'   }
  if (bet.won) return { text: 'WIN',  className: 'text-emerald-400' }
  return         { text: 'LOSS', className: 'text-rose-400'    }
}

export function BetRow({ bet }: BetRowProps) {
  const [expanded, setExpanded] = useState(false)
  const status = statusLabel(bet)

  return (
    <div className="border-b border-zinc-700 last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/30 transition-colors text-left"
      >
        {expanded
          ? <ChevronDown size={16} className="text-zinc-500 shrink-0" />
          : <ChevronRight size={16} className="text-zinc-500 shrink-0" />}
        <span className="text-zinc-400 text-sm w-16 shrink-0">{formatBetDate(bet.bet_date)}</span>
        <Badge sport={bet.sport} className="shrink-0" />
        <span className="text-zinc-100 text-sm flex-1 truncate">{bet.description}</span>
        <span className={`text-sm font-mono tabular-nums shrink-0 ${status.className}`}>{status.text}</span>
        <span className="text-zinc-400 text-sm font-mono tabular-nums w-20 text-right shrink-0">
          R$ {bet.total_buyin.toFixed(2).replace('.', ',')}
        </span>
      </button>
      {expanded && (
        <div className="px-9 pb-3">
          <div className="bg-zinc-900 rounded-lg p-3">
            {bet.event_label && (
              <p className="text-xs text-zinc-500 mb-2">{bet.event_label}</p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs">
                  <th className="text-left pb-1">Jogador</th>
                  <th className="text-right pb-1">Buyin</th>
                  <th className="text-right pb-1">Payout</th>
                  <th className="text-right pb-1">Net</th>
                </tr>
              </thead>
              <tbody>
                {bet.players.map((p) => (
                  <tr key={p.player_id} className="text-zinc-300">
                    <td className="py-0.5">{p.player_name}</td>
                    <td className="text-right font-mono tabular-nums">R$ {p.buyin.toFixed(2).replace('.', ',')}</td>
                    <td className="text-right font-mono tabular-nums">R$ {p.payout.toFixed(2).replace('.', ',')}</td>
                    <td className={`text-right font-mono tabular-nums ${p.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.net >= 0 ? '+' : ''}R$ {p.net.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
