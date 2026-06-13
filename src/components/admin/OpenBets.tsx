import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Copy, Edit2, Check, X } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useOpenBets, type OpenBet } from '../../hooks/useOpenBets'

interface OpenBetsProps {
  adminToken: string
  supabaseFunctionUrl: string
}

function formatDateMD(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${m}/${d}`
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

function betToWhatsApp(bet: OpenBet, values: string[]): string {
  const header = `${bet.sport} • ${formatDateMD(bet.bet_date)} • $${bet.total_buyin.toFixed(2)} → $${bet.total_payout.toFixed(2)}`
  const legLines = bet.description.split('\n').filter((l) => l.trim())
  const lines = legLines.map((leg, i) => `\t\t${values[i] ?? '0'}\t/\t${leg}`)
  return [header, ...lines].join('\n')
}

interface BetCardProps {
  bet: OpenBet
  values: string[]
  onValueChange: (idx: number, value: string) => void
  onValueBlur: (idx: number, value: string) => void
  adminToken: string
  supabaseFunctionUrl: string
  onSettled: () => void
}

function BetCard({ bet, values, onValueChange, onValueBlur, adminToken, supabaseFunctionUrl, onSettled }: BetCardProps) {
  const [settling, setSettling] = useState(false)
  const [editingDistribution, setEditingDistribution] = useState(false)
  const [distributionValues, setDistributionValues] = useState<Record<string, string>>({})
  const [savingDistribution, setSavingDistribution] = useState(false)
  const legLines = bet.description.split('\n').filter((l) => l.trim())

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const p of bet.players) {
      initial[p.player_bet_id] = String(p.buyin)
    }
    setDistributionValues(initial)
  }, [bet.players])

  async function settle(result: 'won' | 'lost') {
    setSettling(true)
    await fetch(`${supabaseFunctionUrl}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'settle_bet', admin_token: adminToken, bet_id: bet.id, result }),
    })
    onSettled()
  }

  function copyOne() {
    void navigator.clipboard.writeText(betToWhatsApp(bet, values))
  }

  const totalDistribution = Object.values(distributionValues)
    .map((v) => parseFloat(v) || 0)
    .reduce((a, b) => a + b, 0)

  const isDistributionValid = Math.abs(totalDistribution - bet.total_buyin) < 0.01

  async function saveDistribution() {
    if (!isDistributionValid) return

    setSavingDistribution(true)
    const distribution = Object.entries(distributionValues).map(([player_bet_id, buyin]) => ({
      player_bet_id,
      buyin: parseFloat(buyin) || 0,
    }))

    await fetch(`${supabaseFunctionUrl}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_bet_distribution',
        admin_token: adminToken,
        bet_id: bet.id,
        distribution,
      }),
    })
    setSavingDistribution(false)
    setEditingDistribution(false)
    onSettled()
  }

  function cancelDistribution() {
    const initial: Record<string, string> = {}
    for (const p of bet.players) {
      initial[p.player_bet_id] = String(p.buyin)
    }
    setDistributionValues(initial)
    setEditingDistribution(false)
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge sport={bet.sport} />
          <span className="text-zinc-400 text-xs">{formatDateMD(bet.bet_date)}</span>
          <span className="text-zinc-300 text-sm font-mono">${bet.total_buyin.toFixed(2)} → ${bet.total_payout.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setEditingDistribution(!editingDistribution)}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Editar distribuição"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={copyOne}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Copiar WhatsApp"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      {editingDistribution && (
        <div className="bg-zinc-900/50 rounded-lg p-3 space-y-2 border border-zinc-700">
          <div className="text-xs text-zinc-400 font-medium mb-2">Redistribuir valores (Total: ${totalDistribution.toFixed(2)} / ${bet.total_buyin.toFixed(2)})</div>
          {bet.players.map((player) => (
            <div key={player.player_bet_id} className="flex items-center gap-2">
              <span className="text-zinc-300 text-sm w-24 truncate">{player.player_name}</span>
              <input
                type="text"
                inputMode="decimal"
                value={distributionValues[player.player_bet_id] ?? '0'}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '')
                  setDistributionValues((prev) => ({ ...prev, [player.player_bet_id]: val }))
                }}
                className={`w-20 bg-zinc-800 border rounded-lg px-2 py-1 text-zinc-100 text-sm font-mono text-center focus:outline-none transition-colors ${
                  isDistributionValid
                    ? 'border-zinc-600 focus:border-amber-500'
                    : 'border-rose-600 focus:border-rose-500'
                }`}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2 border-t border-zinc-700">
            <button
              onClick={saveDistribution}
              disabled={!isDistributionValid || savingDistribution}
              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <Check size={12} />
              Salvar
            </button>
            <button
              onClick={cancelDistribution}
              className="flex-1 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <X size={12} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {legLines.map((leg, i) => {
          const threshold = parseLegThreshold(leg)
          const numVal = parseFloat(values[i] ?? '0') || 0
          const hit = threshold ? isLegHit(threshold, numVal) : false

          return (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={values[i] ?? '0'}
                onChange={(e) => onValueChange(i, e.target.value.replace(/[^0-9.]/g, ''))}
                onBlur={(e) => onValueBlur(i, e.target.value)}
                className="w-14 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-100 text-sm font-mono text-center focus:outline-none focus:border-amber-500"
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
          disabled={settling}
          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          Win
        </button>
        <button
          onClick={() => { void settle('lost') }}
          disabled={settling}
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
  const [legValues, setLegValues] = useState<Record<string, string[]>>({})

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (bets.length === 0) return
    setLegValues((prev) => {
      const next: Record<string, string[]> = {}
      for (const bet of bets) {
        if (prev[bet.id]) {
          next[bet.id] = prev[bet.id]
        } else {
          const legCount = bet.description.split('\n').filter((l) => l.trim()).length
          next[bet.id] = Array.from({ length: legCount }, (_, i) => {
            const lr = bet.leg_results.find((r) => r.leg_index === i)
            return lr?.result_value !== null && lr?.result_value !== undefined
              ? String(lr.result_value)
              : '0'
          })
        }
      }
      return next
    })
  }, [bets])

  const updateValue = useCallback((betId: string, idx: number, value: string) => {
    setLegValues((prev) => {
      const current = prev[betId] ?? []
      const next = [...current]
      next[idx] = value
      return { ...prev, [betId]: next }
    })
  }, [])

  async function upsertLegResult(betId: string, legIndex: number, value: string) {
    const numVal = parseFloat(value)
    if (isNaN(numVal)) return
    await fetch(`${supabaseFunctionUrl}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_leg_result',
        admin_token: adminToken,
        bet_id: betId,
        leg_index: legIndex,
        result_value: numVal,
      }),
    })
  }

  function getValues(bet: OpenBet): string[] {
    const legCount = bet.description.split('\n').filter((l) => l.trim()).length
    const stored = legValues[bet.id] ?? []
    return Array.from({ length: legCount }, (_, i) => stored[i] ?? '0')
  }

  function copyAll() {
    const text = bets.map((bet) => betToWhatsApp(bet, getValues(bet))).join('\n\n')
    void navigator.clipboard.writeText(text)
  }

  if (loading) {
    return <p className="text-zinc-500 text-sm">Carregando...</p>
  }

  if (bets.length === 0) {
    return <p className="text-zinc-500 text-sm">Nenhuma bet em aberto.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={copyAll}
          title="Copiar todas para WhatsApp"
          className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <Copy size={16} />
        </button>
      </div>

      {bets.map((bet) => (
        <BetCard
          key={bet.id}
          bet={bet}
          values={getValues(bet)}
          onValueChange={(idx, val) => updateValue(bet.id, idx, val)}
          onValueBlur={(idx, val) => { void upsertLegResult(bet.id, idx, val) }}
          adminToken={adminToken}
          supabaseFunctionUrl={supabaseFunctionUrl}
          onSettled={load}
        />
      ))}
    </div>
  )
}
