import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { calculatePayout } from '../../lib/payout'
import type { ParsedSlip, Player } from '../../types'
import { SPORTS } from '../../types'

interface PlayerAllocation {
  player_id: string
  name: string
  buyin: string
}

interface SlipUploadProps {
  adminToken: string
  supabaseFunctionUrl: string
  players: Player[]
}

const EMPTY_FORM = {
  slip_ref: '',
  bet_date: new Date().toISOString().slice(0, 10),
  description: '',
  total_buyin: 0,
  total_payout: 0,
  sport: 'NFL',
  won: false,
  gtd: false,
  vendor: 'fanduel',
}

export function SlipUpload({ adminToken, supabaseFunctionUrl, players }: SlipUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [dragging, setDragging]         = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [parseError, setParseError]     = useState<string | null>(null)
  const [form, setForm]                 = useState({ ...EMPTY_FORM })
  const [allocations, setAllocations]   = useState<PlayerAllocation[]>([])
  const [inputTokens, setInputTokens]   = useState<number | null>(null)
  const [outputTokens, setOutputTokens] = useState<number | null>(null)

  useEffect(() => {
    setAllocations(players.map((p) => ({ player_id: p.id, name: p.name, buyin: '' })))
  }, [players])

  async function parseFile(file: File) {
    setParsing(true)
    setParseError(null)
    setSelectedFile(file.name)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch(`${supabaseFunctionUrl}/bet-parse-slip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_token: adminToken, image_base64: base64, vendor: 'fanduel' }),
        })
        const json = (await res.json()) as { data?: ParsedSlip; input_tokens?: number; output_tokens?: number; error?: string }
        if (json.error) throw new Error(json.error)
        if (json.data) {
          setForm((prev) => ({ ...prev, ...json.data, sport: prev.sport, won: prev.won, gtd: prev.gtd }))
          setInputTokens(json.input_tokens ?? null)
          setOutputTokens(json.output_tokens ?? null)
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Erro ao parsear slip')
      }
      setParsing(false)
    }
    reader.readAsDataURL(file)
  }

  function handleFileInputChange() {
    const file = fileRef.current?.files?.[0]
    if (file) void parseFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragging(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    void parseFile(file)
  }

  function totalAllocated(): number {
    return allocations.reduce((s, a) => s + (parseFloat(a.buyin) || 0), 0)
  }

  async function handleSave() {
    const allocated = totalAllocated()
    if (Math.abs(allocated - form.total_buyin) > 0.01) {
      alert(`Total alocado (R$ ${allocated.toFixed(2)}) deve ser igual ao buyin total (R$ ${form.total_buyin.toFixed(2)})`)
      return
    }

    setSaving(true)
    const playerPayload = allocations
      .filter((a) => parseFloat(a.buyin) > 0)
      .map((a) => ({
        player_id: a.player_id,
        buyin: parseFloat(a.buyin),
        payout: calculatePayout({
          buyin: parseFloat(a.buyin),
          totalBuyin: form.total_buyin,
          totalPayout: form.total_payout,
          won: form.won,
          gtd: form.gtd,
        }),
      }))

    await fetch(`${supabaseFunctionUrl}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_bet',
        admin_token: adminToken,
        bet: {
          slip_ref:          form.slip_ref || null,
          bet_date:          form.bet_date,
          description:       form.description,
          sport:             form.sport,
          event_label:       null,
          total_buyin:       form.total_buyin,
          total_payout:      form.total_payout,
          won:               form.won,
          gtd:               form.gtd,
          vendor:            form.vendor,
          api_input_tokens:  inputTokens,
          api_output_tokens: outputTokens,
        },
        players: playerPayload,
      }),
    })

    setSaving(false)
    setSaved(true)
    setForm({ ...EMPTY_FORM })
    setAllocations(players.map((p) => ({ player_id: p.id, name: p.name, buyin: '' })))
    setInputTokens(null)
    setOutputTokens(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-zinc-100 font-semibold text-lg">Upload de Slip</h2>

      <Card className="p-4 space-y-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => { if (!parsing) fileRef.current?.click() }}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 transition-colors ${
            parsing
              ? 'border-zinc-700 cursor-wait'
              : dragging
              ? 'border-amber-500 bg-amber-500/10 cursor-copy'
              : 'border-zinc-600 hover:border-zinc-500 cursor-pointer'
          }`}
        >
          <Upload size={24} className={dragging ? 'text-amber-500' : 'text-zinc-500'} />
          <p className="text-sm text-zinc-400 text-center">
            {parsing
              ? 'Analisando...'
              : selectedFile
              ? selectedFile
              : 'Arraste uma imagem aqui ou clique para selecionar'}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
        {inputTokens !== null && (
          <span className="text-zinc-500 text-xs">
            {inputTokens + (outputTokens ?? 0)} tokens usados
          </span>
        )}
        {parseError && <p className="text-rose-400 text-sm">{parseError}</p>}
      </Card>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data"
            type="date"
            value={form.bet_date}
            onChange={(e) => setForm((f) => ({ ...f, bet_date: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-400">Esporte</label>
            <select
              value={form.sport}
              onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
            >
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <Input
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Total Buyin (R$)"
            type="number"
            step="0.01"
            min="0"
            value={form.total_buyin || ''}
            onChange={(e) => setForm((f) => ({ ...f, total_buyin: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Total Payout (R$)"
            type="number"
            step="0.01"
            min="0"
            value={form.total_payout || ''}
            onChange={(e) => setForm((f) => ({ ...f, total_payout: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.won}
              onChange={(e) => setForm((f) => ({ ...f, won: e.target.checked, gtd: e.target.checked ? false : f.gtd }))}
              className="accent-amber-500 w-4 h-4"
            />
            <span className="text-zinc-200 text-sm">Ganhou</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.gtd}
              onChange={(e) => setForm((f) => ({ ...f, gtd: e.target.checked, won: e.target.checked ? false : f.won }))}
              className="accent-amber-500 w-4 h-4"
            />
            <span className="text-zinc-200 text-sm">GTD (devolvido)</span>
          </label>
        </div>
        <Input
          label="Slip Ref (opcional)"
          value={form.slip_ref}
          onChange={(e) => setForm((f) => ({ ...f, slip_ref: e.target.value }))}
        />
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-zinc-100 font-medium">Alocação por jogador</h3>
          <span className={`text-sm font-mono tabular-nums ${
            Math.abs(totalAllocated() - form.total_buyin) < 0.01 && totalAllocated() > 0
              ? 'text-emerald-400'
              : 'text-zinc-400'
          }`}>
            R$ {totalAllocated().toFixed(2).replace('.', ',')} / R$ {form.total_buyin.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <div className="space-y-2">
          {allocations.map((alloc, i) => (
            <div key={alloc.player_id} className="flex items-center gap-3">
              <span className="text-zinc-200 text-sm w-20 shrink-0">{alloc.name}</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={alloc.buyin}
                onChange={(e) => {
                  const next = [...allocations]
                  next[i] = { ...next[i], buyin: e.target.value }
                  setAllocations(next)
                }}
                className="w-28"
              />
              {parseFloat(alloc.buyin) > 0 && (
                <Badge sport={form.sport} className="text-xs" />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Button
        onClick={() => { void handleSave() }}
        disabled={saving || !form.description || form.total_buyin <= 0}
        className="flex items-center gap-2"
      >
        {saved ? <><CheckCircle size={16} /> Salvo!</> : saving ? 'Salvando...' : 'Confirmar e Salvar'}
      </Button>
    </div>
  )
}
