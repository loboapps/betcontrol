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
  selectedPlayerIds: string[]
): string {
  const fromLabel = formatDate(from)
  const toLabel   = formatDate(to)
  const dateRange = fromLabel === toLabel ? fromLabel : `${fromLabel} a ${toLabel}`

  let text = `📊 BetControl — ${dateRange}\n\n`

  const playerMap = new Map<string, { name: string; buyin: number; payout: number; net: number }>()
  for (const row of rows) {
    for (const p of row.players) {
      if (selectedPlayerIds.length > 0 && !selectedPlayerIds.includes(p.player_id)) continue
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

  const players = Array.from(playerMap.values())
  const totalBuyin  = players.reduce((s, p) => s + p.buyin,  0)
  const totalPayout = players.reduce((s, p) => s + p.payout, 0)
  const totalNet    = players.reduce((s, p) => s + p.net,    0)

  const label = selectedPlayerIds.length === 0 ? 'Grupo' : players.map((p) => p.name).join(' + ')
  text += `💰 ${label}\n`
  text += `Investido: ${brl(totalBuyin)}\n`
  text += `Retorno:   ${brl(totalPayout)}\n`
  text += `Lucro:     ${formatBRL(totalNet)}\n`

  if (selectedPlayerIds.length > 1) {
    for (const player of players) {
      text += `\n👤 ${player.name}\n`
      text += `Investido: ${brl(player.buyin)}\n`
      text += `Retorno:   ${brl(player.payout)}\n`
      text += `Lucro:     ${formatBRL(player.net)}\n`
    }
  } else if (selectedPlayerIds.length === 0) {
    for (const player of players) {
      text += `\n👤 ${player.name}\n`
      text += `Investido: ${brl(player.buyin)}\n`
      text += `Retorno:   ${brl(player.payout)}\n`
      text += `Lucro:     ${formatBRL(player.net)}\n`
    }
  }

  return text
}

export function porEventoToWhatsApp(
  rows: PorEventoRow[],
  sport: string | null,
  selectedPlayerIds: string[]
): string {
  const label = sport ? sport : 'Todos os esportes'
  let text = `📊 BetControl — Por Evento (${label})\n\n`

  const totBuyin  = rows.reduce((s, r) => {
    if (selectedPlayerIds.length === 0) return s + r.group_buyin
    return s + r.players.filter((p) => selectedPlayerIds.includes(p.player_id)).reduce((a, p) => a + p.buyin, 0)
  }, 0)
  const totPayout = rows.reduce((s, r) => {
    if (selectedPlayerIds.length === 0) return s + r.group_payout
    return s + r.players.filter((p) => selectedPlayerIds.includes(p.player_id)).reduce((a, p) => a + p.payout, 0)
  }, 0)
  const totNet = rows.reduce((s, r) => {
    if (selectedPlayerIds.length === 0) return s + r.group_net
    return s + r.players.filter((p) => selectedPlayerIds.includes(p.player_id)).reduce((a, p) => a + p.net, 0)
  }, 0)

  const groupLabel = selectedPlayerIds.length === 0 ? 'Grupo' : 'Selecionados'
  text += `💰 ${groupLabel}\n`
  text += `Investido: ${brl(totBuyin)}\n`
  text += `Retorno:   ${brl(totPayout)}\n`
  text += `Lucro:     ${formatBRL(totNet)}\n`

  for (const row of rows) {
    const eventName = row.event_label ? `${row.sport} — ${row.event_label}` : row.sport
    const selected = selectedPlayerIds.length > 0
      ? row.players.filter((p) => selectedPlayerIds.includes(p.player_id))
      : null

    const evBuyin  = selected ? selected.reduce((s, p) => s + p.buyin,  0) : row.group_buyin
    const evNet    = selected ? selected.reduce((s, p) => s + p.net,    0) : row.group_net

    text += `\n📌 ${eventName} (${row.bet_count} bet${row.bet_count !== 1 ? 's' : ''})\n`
    text += `Investido: ${brl(evBuyin)}\n`
    text += `Lucro:     ${formatBRL(evNet)}\n`
  }

  return text
}
