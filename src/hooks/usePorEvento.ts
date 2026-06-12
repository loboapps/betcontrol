import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { PorEventoRow } from '../types'

export function usePorEvento(from: string, to: string) {
  const [rows, setRows] = useState<PorEventoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bet_get_por_evento', { p_from: from, p_to: to })
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setRows((data as PorEventoRow[] | null) ?? [])
        setLoading(false)
      })
  }, [from, to])

  return { rows, loading, error }
}
