import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { PlayerSidebar } from '../components/analytics/PlayerSidebar'
import { PorEventoTable } from '../components/analytics/PorEventoTable'
import { Button } from '../components/ui/Button'
import { usePorEvento } from '../hooks/usePorEvento'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { porEventoToWhatsApp } from '../lib/clipboard'
import { SPORTS } from '../types'

function todayISO() { return new Date().toISOString().slice(0, 10) }
function thirtyDaysAgoISO() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export function PorEvento() {
  const [sport, setSport]               = useState<string | null>(null)
  const [selectedIds, setSelectedIds]   = useState<string[]>([])

  const from = thirtyDaysAgoISO()
  const to   = todayISO()

  const { rows, loading: dataLoading }       = usePorEvento(from, to)
  const { players, loading: playersLoading } = usePlayerSummary()

  const filtered = sport ? rows.filter((r) => r.sport === sport) : rows

  function handleCopy() {
    const text = porEventoToWhatsApp(filtered, sport, selectedIds)
    void navigator.clipboard.writeText(text)
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setSport(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sport === null ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Todos
          </button>
          {SPORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sport === s ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {s}
            </button>
          ))}
          <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-2 ml-auto">
            <Copy size={14} /> Copiar WhatsApp
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <PlayerSidebar
            players={players}
            loading={playersLoading}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
          />
          <div className="flex-1">
            <PorEventoTable rows={filtered} loading={dataLoading} selectedPlayerIds={selectedIds} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
