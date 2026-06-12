import { useState } from 'react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useUnclassifiedBets } from '../../hooks/useUnclassifiedBets'

interface ClassifyBetsProps {
  adminToken: string
  supabaseFunctionUrl: string
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export function ClassifyBets({ adminToken, supabaseFunctionUrl }: ClassifyBetsProps) {
  const { bets, loading, reload } = useUnclassifiedBets()
  const [labels, setLabels]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)

  async function handleSave() {
    setSaving(true)
    const classifications = Object.entries(labels)
      .filter(([, label]) => label.trim() !== '')
      .map(([bet_id, event_label]) => ({ bet_id, event_label: event_label.trim() }))

    if (classifications.length === 0) { setSaving(false); return }

    await fetch(`${supabaseFunctionUrl}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'classify_events', admin_token: adminToken, classifications }),
    })

    setSaving(false)
    setLabels({})
    reload()
  }

  if (loading) return <div className="text-zinc-500 text-sm p-4">Carregando...</div>
  if (bets.length === 0) return (
    <div className="p-8 text-center text-zinc-500">
      Todas as apostas estão classificadas.
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-zinc-100 font-semibold text-lg">Classificar Eventos</h2>
        <span className="text-zinc-500 text-sm">{bets.length} sem classificação</span>
      </div>
      <div className="space-y-2">
        {bets.map((bet) => (
          <Card key={bet.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-zinc-400 text-xs">{formatDate(bet.bet_date)}</span>
                  <Badge sport={bet.sport} />
                </div>
                <p className="text-zinc-200 text-sm">{bet.description}</p>
              </div>
              <Input
                placeholder="ex: 24-25 Wk 09"
                value={labels[bet.id] ?? ''}
                onChange={(e) => setLabels((prev) => ({ ...prev, [bet.id]: e.target.value }))}
                className="w-40 shrink-0"
              />
            </div>
          </Card>
        ))}
      </div>
      <Button
        onClick={() => { void handleSave() }}
        disabled={saving || Object.values(labels).every((v) => v.trim() === '')}
      >
        {saving ? 'Salvando...' : 'Salvar Classificações'}
      </Button>
    </div>
  )
}
