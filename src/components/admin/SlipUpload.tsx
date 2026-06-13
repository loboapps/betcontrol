import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle, Plus } from 'lucide-react'
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

function todayET(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function makeEmptyForm() {
  return {
    slip_ref: '',
    bet_date: todayET(),
    sport: '',
    won: false,
    gtd: false,
    vendor: 'fanduel',
    total_buyin: 0,
    total_payout: 0,
  }
}

function onlyDecimal(val: string): string {
  const cleaned = val.replace(/[^0-9.]/g, '')
  const parts = cleaned.split('.')
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned
}

export function SlipUpload({ adminToken, supabaseFunctionUrl, players }: SlipUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [dragging, setDragging]         = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [parseError, setParseError]     = useState<string | null>(null)
  const [form, setForm]                 = useState(makeEmptyForm())
  const [legs, setLegs]                 = useState<string[]>([''])
  const [buyinStr, setBuyinStr]         = useState('')
  const [payoutStr, setPayoutStr]       = useState('')
  const [allocations, setAllocations]   = useState<PlayerAllocation[]>([])
  const [inputTokens, setInputTokens]   = useState<number | null>(null)
  const [outputTokens, setOutputTokens] = useState<number | null>(null)

  useEffect(() => {
    setAllocations(players.map((p) => ({ player_id: p.id, name: p.name, buyin: '' })))
  }, [players])

  const parseFileRef = useRef(parseFile)
  useEffect(() => { parseFileRef.current = parseFile })

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (file) void parseFileRef.current(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

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
          body: JSON.stringify({ admin_token: adminToken, image_base64: base64, media_type: file.type, vendor: 'fanduel' }),
        })
        const json = (await res.json()) as { data?: ParsedSlip; input_tokens?: number; output_tokens?: number; error?: string }
        if (json.error) throw new Error(json.error)
        if (json.data) {
          const data = json.data
          setForm((prev) => ({
            ...prev,
            slip_ref:    data.slip_ref,
            bet_date:    data.bet_date,
            vendor:      data.vendor,
            total_buyin: data.total_buyin,
            total_payout: data.total_payout,
          }))
          const parsed = data.description.split('\n').filter((l) => l.trim())
          setLegs(parsed.length > 0 ? parsed : [''])
          setBuyinStr(data.total_buyin > 0 ? data.total_buyin.toFixed(2) : '')
          setPayoutStr(data.total_payout > 0 ? data.total_payout.toFixed(2) : '')
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

  function updateLeg(i: number, value: string) {
    setLegs((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  function totalAllocated(): number {
    return allocations.reduce((s, a) => s + (parseFloat(a.buyin) || 0), 0)
  }

  async function handleSave() {
    const allocated = totalAllocated()
    if (Math.abs(allocated - form.total_buyin) > 0.01) {
      alert(`Total alocado ($${allocated.toFixed(2)}) deve ser igual ao wager ($${form.total_buyin.toFixed(2)})`)
      return
    }

    const description = legs.filter((l) => l.trim()).join('\n')

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
          description,
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
    setForm(makeEmptyForm())
    setLegs([''])
    setBuyinStr('')
    setPayoutStr('')
    setAllocations(players.map((p) => ({ player_id: p.id, name: p.name, buyin: '' })))
    setInputTokens(null)
    setOutputTokens(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setTimeout(() => setSaved(false), 3000)
  }

  const hasLegs = legs.some((l) => l.trim())

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
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-400">Data</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={form.bet_date}
                onChange={(e) => setForm((f) => ({ ...f, bet_date: e.target.value }))}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, bet_date: todayET() }))}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-300 text-xs font-medium transition-colors"
              >
                Hoje
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-400">Esporte</label>
            <select
              value={form.sport}
              onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="">—</option>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-zinc-400">Legs</label>
          {legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-zinc-600 text-xs tabular-nums w-4 text-right shrink-0">{i + 1}</span>
              <input
                value={leg}
                onChange={(e) => updateLeg(i, e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLegs((prev) => [...prev, ''])}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 self-start mt-0.5 transition-colors"
          >
            <Plus size={12} /> add leg
          </button>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm text-zinc-400">Wager ($)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={buyinStr}
              onChange={(e) => {
                const val = onlyDecimal(e.target.value)
                setBuyinStr(val)
                setForm((f) => ({ ...f, total_buyin: parseFloat(val) || 0 }))
              }}
              onBlur={() => {
                if (form.total_buyin > 0) setBuyinStr(form.total_buyin.toFixed(2))
              }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm text-zinc-400">Payout ($)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={payoutStr}
              onChange={(e) => {
                const val = onlyDecimal(e.target.value)
                setPayoutStr(val)
                setForm((f) => ({ ...f, total_payout: parseFloat(val) || 0 }))
              }}
              onBlur={() => {
                if (form.total_payout > 0) setPayoutStr(form.total_payout.toFixed(2))
              }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-2.5">
            <input
              type="checkbox"
              checked={form.gtd}
              onChange={(e) => setForm((f) => ({ ...f, gtd: e.target.checked }))}
              className="accent-amber-500 w-4 h-4"
            />
            <span className="text-zinc-200 text-sm">GTD</span>
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
            ${totalAllocated().toFixed(2)} / ${form.total_buyin.toFixed(2)}
          </span>
        </div>
        <div className="space-y-2">
          {allocations.map((alloc, i) => (
            <div key={alloc.player_id} className="flex items-center gap-3">
              <span className="text-zinc-200 text-sm w-20 shrink-0">{alloc.name}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={alloc.buyin}
                onChange={(e) => {
                  const val = onlyDecimal(e.target.value)
                  const next = [...allocations]
                  next[i] = { ...next[i], buyin: val }
                  setAllocations(next)
                }}
                onBlur={() => {
                  const n = parseFloat(alloc.buyin)
                  if (n > 0) {
                    const next = [...allocations]
                    next[i] = { ...next[i], buyin: n.toFixed(2) }
                    setAllocations(next)
                  }
                }}
                className="w-28 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm font-mono focus:outline-none focus:border-amber-500"
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
        disabled={saving || !form.sport || !hasLegs || form.total_buyin <= 0}
        className="flex items-center gap-2"
      >
        {saved ? <><CheckCircle size={16} /> Salvo!</> : saving ? 'Salvando...' : 'Confirmar e Salvar'}
      </Button>
    </div>
  )
}
