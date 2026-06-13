import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface LegResult {
  leg_index: number
  result_value: number | null
}

export interface PlayerBetDistribution {
  player_bet_id: string
  player_id: string
  player_name: string
  buyin: number
}

export interface OpenBet {
  id: string
  slip_ref: string | null
  bet_date: string
  description: string
  sport: string
  total_buyin: number
  total_payout: number
  leg_results: LegResult[]
  players: PlayerBetDistribution[]
}

export function useOpenBets() {
  const [bets, setBets] = useState<OpenBet[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    supabase
      .rpc('bet_get_open_bets')
      .then(({ data }) => {
        setBets((data as OpenBet[] | null) ?? [])
        setLoading(false)
      })
  }, [])

  return { bets, loading, load }
}
