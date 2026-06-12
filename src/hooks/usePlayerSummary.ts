import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Player } from '../types'

export function usePlayerSummary() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .rpc('bet_get_player_summary')
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setPlayers((data as Player[] | null) ?? [])
        setLoading(false)
      })
  }, [])

  return { players, loading, error }
}
