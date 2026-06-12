import { describe, it, expect } from 'vitest'
import { calculatePayout } from '../payout'

describe('calculatePayout', () => {
  it('GTD: always returns the player buyin regardless of won', () => {
    expect(calculatePayout({ buyin: 100, totalBuyin: 300, totalPayout: 900, won: false, gtd: true })).toBe(100)
    expect(calculatePayout({ buyin: 50,  totalBuyin: 300, totalPayout: 900, won: true,  gtd: true })).toBe(50)
  })

  it('Lost + not GTD: returns 0', () => {
    expect(calculatePayout({ buyin: 100, totalBuyin: 300, totalPayout: 900, won: false, gtd: false })).toBe(0)
  })

  it('Won: returns proportional share of total payout', () => {
    // 100/300 * 900 = 300
    expect(calculatePayout({ buyin: 100, totalBuyin: 300, totalPayout: 900, won: true, gtd: false })).toBeCloseTo(300)
    // 150/300 * 900 = 450
    expect(calculatePayout({ buyin: 150, totalBuyin: 300, totalPayout: 900, won: true, gtd: false })).toBeCloseTo(450)
    // Equal split: 100/200 * 400 = 200
    expect(calculatePayout({ buyin: 100, totalBuyin: 200, totalPayout: 400, won: true, gtd: false })).toBeCloseTo(200)
  })
})
