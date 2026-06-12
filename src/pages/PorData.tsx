import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { PlayerSidebar } from '../components/analytics/PlayerSidebar'
import { PorDataTable } from '../components/analytics/PorDataTable'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { usePorData } from '../hooks/usePorData'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { porDataToWhatsApp } from '../lib/clipboard'

function todayISO() { return new Date().toISOString().slice(0, 10) }
function thirtyDaysAgoISO() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export function PorData() {
  const [from, setFrom]             = useState(thirtyDaysAgoISO)
  const [to, setTo]                 = useState(todayISO)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { rows, loading: dataLoading }       = usePorData(from, to)
  const { players, loading: playersLoading } = usePlayerSummary()

  function handleCopy() {
    const text = porDataToWhatsApp(rows, from, to, selectedId)
    void navigator.clipboard.writeText(text)
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <Input type="date" label="De"  value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <Input type="date" label="Até" value={to}   onChange={(e) => setTo(e.target.value)}   className="w-36" />
          <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-2 mb-0.5">
            <Copy size={14} /> Copiar WhatsApp
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <PlayerSidebar
            players={players}
            loading={playersLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="flex-1">
            <PorDataTable rows={rows} loading={dataLoading} selectedPlayerId={selectedId} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
