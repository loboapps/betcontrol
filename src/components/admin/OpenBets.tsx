import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useOpenBets, type OpenBet } from '../../hooks/useOpenBets'

interface OpenBetsProps {
  adminToken: string
  supabaseFunctionUrl: string
}

interface LegState {
  value: string
}

interface BetCardState {
  legs: LegState[]
  settling: boolean
}

function parseLegThreshold(leg: string): { dir: 'o' | 'u'; threshold: number; inclusive: boolean } | null {
  const match = leg.match(/\b([ou])(\d+(?:\.\d+)?)(\+)?/)
  if (!match) return null
  return {
    dir: match[1] as 'o' | 'u',
    threshold: parseFloat(match[2]),
    inclusive: !!match[3],
  }
}

function isLegHit(parsed: { dir: 'o' | 'u'; threshold: number; inclusive: boolean }, input: number): boolean {
  const { dir, threshold, inclusive } = parsed
  if (dir === 'o') return inclusive ? input >= threshold : input > threshold
  return inclusive ? input <= threshold : input < threshold
}

function BetCard({ bet, adminToken, supabaseFunctionUrl, onSettled }: {
  bet: OpenBet
  adminToken: string
  supabaseFunctionUrl: string
  onSettled: () => void
}) {
  const legLines = bet.description.split('\n').filter((l) => l.trim())
  const [state, setState] = useState<BetCardState>({
    legs: legLines.map(() => ({ value: '' })),
    settling: false,
  })

  function updateLegValue(i: number, value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '')
    setState((s) => {
      const legs = [...s.legs]
      legs[i] = { value: cleaned }
      return { ...s, legs }
    })
  }

  async function settle(result: 'won' | 'lost') {
    setState((s) => ({ ...s, settling: true }))
    await fetch(`${supabaseFunctionUrl}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'settle_bet', admin_token: adminToken, bet_id: bet.id, result }),
    })
    onSettled()
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge sport={bet.sport} />
          <span className="text-zinc-400 text-xs">{bet.bet_date}</span>
        </div>
        <span className="text-zinc-300 text-sm font-mono">${bet.total_buyin.toFixed(2)} → ${bet.total_payout.toFixed(2)}</span>
      </div>

      <div className="space-y-2">
        {legLines.map((leg, i) => {
          const threshold = parseLegThreshold(leg)
          const numVal = parseFloat(state.legs[i]?.value || '0') || 0
          const hit = threshold ? isLegHit(threshold, numVal) : false

          return (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={state.legs[i]?.value ?? ''}
                onChange={(e) => updateLegValue(i, e.target.value)}
                className="w-14 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-100 text-sm font-mono text-center focus:outline-none focus:border-amber-500"
                placeholder="0"
              />
              <span className="text-zinc-600 text-xs">/</span>
              <span className={`text-sm font-mono flex-1 ${hit ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {leg}
              </span>
              {threshold && hit && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { void settle('won') }}
          disabled={state.settling}
          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          Win
        </button>
        <button
          onClick={() => { void settle('lost') }}
          disabled={state.settling}
          className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          Lose
        </button>
      </div>
    </Card>
  )
}

export function OpenBets({ adminToken, supabaseFunctionUrl }: OpenBetsProps) {
  const { bets, loading, load } = useOpenBets()

  useEffect(() => { load() }, [load])

  if (loading) {
    return <p className="text-zinc-500 text-sm">Carregando...</p>
  }

  if (bets.length === 0) {
    return <p className="text-zinc-500 text-sm">Nenhuma bet em aberto.</p>
  }

  return (
    <div className="space-y-4">
      {bets.map((bet) => (
        <BetCard
          key={bet.id}
          bet={bet}
          adminToken={adminToken}
          supabaseFunctionUrl={supabaseFunctionUrl}
          onSettled={load}
        />
      ))}
    </div>
  )
}
