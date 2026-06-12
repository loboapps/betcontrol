import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { SlipUpload } from '../components/admin/SlipUpload'
import { ClassifyBets } from '../components/admin/ClassifyBets'
import { ManageDeposits } from '../components/admin/ManageDeposits'
import { usePlayerSummary } from '../hooks/usePlayerSummary'

const SUPABASE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`

type AdminSection = 'upload' | 'classify' | 'deposits'

const NUMPAD_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'] as const

function PinScreen({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState('')

  function handleKey(key: string) {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1))
    } else if (pin.length < 4) {
      const next = pin + key
      setPin(next)
      if (next.length === 4) onUnlock(next)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <p className="text-amber-500 font-bold text-xl">BetControl Admin</p>
        <div className="flex gap-4">
          {[0,1,2,3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length ? 'bg-amber-500 border-amber-500' : 'border-zinc-600'
              }`}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {NUMPAD_KEYS.map((key, idx) => (
            <button
              key={idx}
              onClick={() => key !== '' && handleKey(key)}
              disabled={key === ''}
              className={`w-16 h-16 rounded-2xl text-xl font-semibold transition-colors ${
                key === ''
                  ? 'invisible'
                  : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Admin() {
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [section, setSection] = useState<AdminSection>('upload')
  const { players } = usePlayerSummary()

  async function handleUnlock(pin: string) {
    const res = await fetch(`${SUPABASE_FUNCTION_URL}/bet-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'classify_events', admin_token: pin, classifications: [] }),
    })
    if (res.status === 401) {
      setUnauthorized(true)
      setTimeout(() => setUnauthorized(false), 1500)
    } else {
      setAdminToken(pin)
    }
  }

  if (!adminToken) {
    return (
      <div className="relative">
        <PinScreen onUnlock={(pin) => { void handleUnlock(pin) }} />
        {unauthorized && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-rose-400 font-semibold text-lg bg-zinc-900/80 px-6 py-3 rounded-xl">
              PIN incorreto
            </p>
          </div>
        )}
      </div>
    )
  }

  const tabs: { key: AdminSection; label: string }[] = [
    { key: 'upload',   label: 'Upload Slip' },
    { key: 'classify', label: 'Classificar'  },
    { key: 'deposits', label: 'Depósitos'    },
  ]

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-amber-500 font-bold text-xl mb-4">Admin</h1>
        <div className="flex gap-2 mb-6 border-b border-zinc-700 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSection(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                section === tab.key
                  ? 'bg-zinc-800 text-amber-500 border border-b-zinc-800 border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {section === 'upload'   && <SlipUpload     adminToken={adminToken} supabaseFunctionUrl={SUPABASE_FUNCTION_URL} players={players} />}
        {section === 'classify' && <ClassifyBets   adminToken={adminToken} supabaseFunctionUrl={SUPABASE_FUNCTION_URL} />}
        {section === 'deposits' && <ManageDeposits adminToken={adminToken} supabaseFunctionUrl={SUPABASE_FUNCTION_URL} />}
      </div>
    </Layout>
  )
}
