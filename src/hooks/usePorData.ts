import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { PorDataRow } from '../types'

export function usePorData(from: string, to: string) {
  const [rows, setRows] = useState<PorDataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bet_get_por_data', { p_from: from, p_to: to })
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setRows((data as PorDataRow[] | null) ?? [])
        setLoading(false)
      })
  }, [from, to])

  return { rows, loading, error }
}
