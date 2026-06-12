import { Input } from '../ui/Input'
import { SPORTS } from '../../types'

interface BetFiltersProps {
  from: string
  to: string
  sport: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  onSportChange: (v: string) => void
}

export function BetFilters({ from, to, sport, onFromChange, onToChange, onSportChange }: BetFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 p-4">
      <Input
        type="date"
        label="De"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="w-36"
      />
      <Input
        type="date"
        label="Até"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="w-36"
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Esporte</label>
        <select
          value={sport}
          onChange={(e) => onSportChange(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
        >
          <option value="">Todos</option>
          {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}
