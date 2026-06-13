export interface Player {
  id: string
  name: string
  display_order: number
  total_deposited: number
  net_pnl: number
  balance: number
}

export interface BetPlayer {
  player_id: string
  player_name: string
  buyin: number
  payout: number
  net: number
}

export interface Bet {
  id: string
  slip_ref: string | null
  bet_date: string
  description: string
  sport: string
  event_label: string | null
  total_buyin: number
  total_payout: number
  won: boolean
  gtd: boolean
  vendor: string
  settled_at: string | null
  players: BetPlayer[]
}

export interface PorDataRow {
  bet_date: string
  group_buyin: number
  group_payout: number
  group_net: number
  bet_count: number
  players: BetPlayer[]
}

export interface PorEventoRow {
  sport: string
  event_label: string | null
  group_buyin: number
  group_payout: number
  group_net: number
  bet_count: number
  players: BetPlayer[]
}

export interface UnclassifiedBet {
  id: string
  bet_date: string
  description: string
  sport: string
  event_label: string | null
}

export interface ParsedSlip {
  slip_ref: string
  bet_date: string
  description: string
  total_buyin: number
  total_payout: number
  vendor: string
}

export const SPORTS = ['NFL', 'FIFA', 'NBA', 'MLB', 'NHL', 'Other'] as const
export type Sport = (typeof SPORTS)[number]

export interface PayoutArgs {
  buyin: number
  totalBuyin: number
  totalPayout: number
  won: boolean
  gtd: boolean
}
