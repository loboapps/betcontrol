import type { PorDataRow, PorEventoRow } from '../types'

export function formatBRL(value: number): string {
  const abs = Math.abs(value).toFixed(2).replace('.', ',')
  if (value > 0) return `+R$ ${abs}`
  if (value < 0) return `-R$ ${abs}`
  return `R$ ${abs}`
}

function brl(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

export function porDataToWhatsApp(
  rows: PorDataRow[],
  from: string,
  to: string,
  selectedPlayerId: string | null
): string {
  const groupBuyin  = rows.reduce((s, r) => s + r.group_buyin, 0)
  const groupPayout = rows.reduce((s, r) => s + r.group_payout, 0)
  const groupNet    = rows.reduce((s, r) => s + r.group_net, 0)

  const fromLabel = formatDate(from)
  const toLabel   = formatDate(to)
  const dateRange = fromLabel === toLabel ? fromLabel : `${fromLabel} a ${toLabel}`

  let text = `📊 BetControl — ${dateRange}\n\n`
  text += `💰 Grupo\n`
  text += `Investido: ${brl(groupBuyin)}\n`
  text += `Retorno:   ${brl(groupPayout)}\n`
  text += `Lucro:     ${formatBRL(groupNet)}\n`

  const playerMap = new Map<string, { name: string; buyin: number; payout: number; net: number }>()
  for (const row of rows) {
    for (const p of row.players) {
      if (selectedPlayerId && p.player_id !== selectedPlayerId) continue
      const existing = playerMap.get(p.player_id)
      if (existing) {
        existing.buyin  += p.buyin
        existing.payout += p.payout
        existing.net    += p.net
      } else {
        playerMap.set(p.player_id, { name: p.player_name, buyin: p.buyin, payout: p.payout, net: p.net })
      }
    }
  }

  for (const [, player] of playerMap) {
    text += `\n👤 ${player.name}\n`
    text += `Investido: ${brl(player.buyin)}\n`
    text += `Retorno:   ${brl(player.payout)}\n`
    text += `Lucro:     ${formatBRL(player.net)}\n`
  }

  return text
}

export function porEventoToWhatsApp(
  rows: PorEventoRow[],
  sport: string | null,
  selectedPlayerId: string | null
): string {
  const groupBuyin  = rows.reduce((s, r) => s + r.group_buyin, 0)
  const groupPayout = rows.reduce((s, r) => s + r.group_payout, 0)
  const groupNet    = rows.reduce((s, r) => s + r.group_net, 0)

  const label = sport ? sport : 'Todos os esportes'
  let text = `📊 BetControl — Por Evento (${label})\n\n`
  text += `💰 Grupo\n`
  text += `Investido: ${brl(groupBuyin)}\n`
  text += `Retorno:   ${brl(groupPayout)}\n`
  text += `Lucro:     ${formatBRL(groupNet)}\n`

  for (const row of rows) {
    const eventName = row.event_label ? `${row.sport} — ${row.event_label}` : row.sport
    text += `\n📌 ${eventName} (${row.bet_count} bet${row.bet_count !== 1 ? 's' : ''})\n`
    text += `Investido: ${brl(row.group_buyin)}\n`
    text += `Lucro:     ${formatBRL(row.group_net)}\n`

    if (selectedPlayerId) {
      const player = row.players.find((p) => p.player_id === selectedPlayerId)
      if (player) {
        text += `${player.player_name}: ${formatBRL(player.net)}\n`
      }
    }
  }

  return text
}
