import { useState } from 'react'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { usePlayerSummary } from '../../hooks/usePlayerSummary'

interface ManageDepositsProps {
  adminToken: string
  supabaseFunctionUrl: string
}

export function ManageDeposits({ adminToken, supabaseFunctionUrl }: ManageDepositsProps) {
  const { players, loading } = usePlayerSummary()
  const [deposits, setDeposits] = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  function getValue(playerId: string, current: number): string {
    return deposits[playerId] ?? current.toFixed(2)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const payload = players
      .filter((p) => deposits[p.id] !== undefined)
      .map((p) => ({
        player_id: p.id,
        total_deposited: parseFloat(deposits[p.id]),
      }))
      .filter((d) => !isNaN(d.total_deposited))

    if (payload.length === 0) { setSaving(false); return }

    await fetch(`${supabaseFunctionUrl}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_deposits', admin_token: adminToken, deposits: payload }),
    })

    setSaving(false)
    setSaved(true)
    setDeposits({})
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="text-zinc-500 text-sm p-4">Carregando jogadores...</div>

  return (
    <div className="space-y-4">
      <h2 className="text-zinc-100 font-semibold text-lg">Gerenciar Depósitos</h2>
      <div className="space-y-2">
        {players.map((player) => (
          <Card key={player.id} className="p-4 flex items-center gap-4">
            <span className="text-zinc-100 font-medium w-24 shrink-0">{player.name}</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={getValue(player.id, player.total_deposited)}
              onChange={(e) => setDeposits((prev) => ({ ...prev, [player.id]: e.target.value }))}
              className="w-32"
            />
            <span className="text-zinc-500 text-xs">saldo atual: R$ {player.balance.toFixed(2).replace('.', ',')}</span>
          </Card>
        ))}
      </div>
      <Button onClick={() => { void handleSave() }} disabled={saving || Object.keys(deposits).length === 0}>
        {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Depósitos'}
      </Button>
    </div>
  )
}
