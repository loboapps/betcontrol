import { Copy } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { BetRow } from './BetRow'
import type { Bet } from '../../types'

interface BetListProps {
  bets: Bet[]
  loading: boolean
  onCopyWhatsApp: () => void
}

export function BetList({ bets, loading, onCopyWhatsApp }: BetListProps) {
  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Carregando...</div>
  }

  if (bets.length === 0) {
    return <div className="p-8 text-center text-zinc-500">Nenhuma aposta encontrada.</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center px-4 py-2">
        <span className="text-sm text-zinc-500">{bets.length} aposta{bets.length !== 1 ? 's' : ''}</span>
        <Button variant="secondary" onClick={onCopyWhatsApp} className="flex items-center gap-2">
          <Copy size={14} />
          Copiar WhatsApp
        </Button>
      </div>
      <Card className="mx-4 overflow-hidden">
        {bets.map((bet) => <BetRow key={bet.id} bet={bet} />)}
      </Card>
    </div>
  )
}
