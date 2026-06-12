import { describe, it, expect } from 'vitest'
import { formatBRL, porDataToWhatsApp } from '../clipboard'
import type { PorDataRow } from '../../types'

describe('formatBRL', () => {
  it('formats positive value with + sign', () => {
    expect(formatBRL(160)).toBe('+R$ 160,00')
  })
  it('formats negative value with - sign', () => {
    expect(formatBRL(-50)).toBe('-R$ 50,00')
  })
  it('formats zero without sign', () => {
    expect(formatBRL(0)).toBe('R$ 0,00')
  })
})

describe('porDataToWhatsApp', () => {
  const rows: PorDataRow[] = [
    {
      bet_date: '2024-11-10',
      group_buyin: 300,
      group_payout: 460,
      group_net: 160,
      bet_count: 2,
      players: [
        { player_id: '1', player_name: 'Wolf', buyin: 150, payout: 230, net: 80 },
        { player_id: '2', player_name: 'Choi', buyin: 150, payout: 230, net: 80 },
      ],
    },
  ]

  it('includes date range in header', () => {
    const text = porDataToWhatsApp(rows, '2024-11-10', '2024-11-10', null)
    expect(text).toContain('10/11')
  })

  it('includes group totals', () => {
    const text = porDataToWhatsApp(rows, '2024-11-10', '2024-11-10', null)
    expect(text).toContain('300,00')
    expect(text).toContain('+R$ 160,00')
  })

  it('includes all player names when no player selected', () => {
    const text = porDataToWhatsApp(rows, '2024-11-10', '2024-11-10', null)
    expect(text).toContain('Wolf')
    expect(text).toContain('Choi')
  })
})
