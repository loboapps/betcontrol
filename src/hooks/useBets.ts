import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Bet } from '../types'

export function useBets(from: string, to: string) {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bet_get_bets', { p_from: from, p_to: to })
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setBets((data as Bet[] | null) ?? [])
        setLoading(false)
      })
  }, [from, to])

  return { bets, loading, error }
}
