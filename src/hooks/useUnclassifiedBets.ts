import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UnclassifiedBet } from '../types'

export function useUnclassifiedBets() {
  const [bets, setBets] = useState<UnclassifiedBet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bet_get_unclassified_bets')
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setBets((data as UnclassifiedBet[] | null) ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { bets, loading, error, reload: load }
}
