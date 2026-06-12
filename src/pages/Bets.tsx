import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { BetFilters } from '../components/bets/BetFilters'
import { BetList } from '../components/bets/BetList'
import { useBets } from '../hooks/useBets'
import { porDataToWhatsApp } from '../lib/clipboard'
import type { PorDataRow } from '../types'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function sevenDaysAgoISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

export function Bets() {
  const [from, setFrom]   = useState(sevenDaysAgoISO)
  const [to, setTo]       = useState(todayISO)
  const [sport, setSport] = useState('')

  const { bets, loading } = useBets(from, to)

  const filtered = sport ? bets.filter((b) => b.sport === sport) : bets

  function handleCopyWhatsApp() {
    const byDate = new Map<string, PorDataRow>()
    for (const bet of filtered) {
      const row = byDate.get(bet.bet_date) ?? {
        bet_date: bet.bet_date,
        group_buyin: 0,
        group_payout: 0,
        group_net: 0,
        bet_count: 0,
        players: [],
      }
      const effectivePayout = bet.gtd ? bet.total_buyin : bet.won ? bet.total_payout : 0
      row.group_buyin  += bet.total_buyin
      row.group_payout += effectivePayout
      row.group_net    += effectivePayout - bet.total_buyin
      row.bet_count    += 1
      for (const p of bet.players) {
        const existing = row.players.find((rp) => rp.player_id === p.player_id)
        if (existing) {
          existing.buyin  += p.buyin
          existing.payout += p.payout
          existing.net    += p.net
        } else {
          row.players.push({ ...p })
        }
      }
      byDate.set(bet.bet_date, row)
    }
    const rows = Array.from(byDate.values()).sort((a, b) => b.bet_date.localeCompare(a.bet_date))
    const text = porDataToWhatsApp(rows, from, to, [])
    void navigator.clipboard.writeText(text)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <BetFilters
          from={from} to={to} sport={sport}
          onFromChange={setFrom} onToChange={setTo} onSportChange={setSport}
        />
        <BetList bets={filtered} loading={loading} onCopyWhatsApp={handleCopyWhatsApp} />
      </div>
    </Layout>
  )
}
