import type { PayoutArgs } from '../types'

export function calculatePayout({ buyin, totalBuyin, totalPayout, won, gtd }: PayoutArgs): number {
  if (gtd) return buyin
  if (!won) return 0
  return (buyin / totalBuyin) * totalPayout
}
