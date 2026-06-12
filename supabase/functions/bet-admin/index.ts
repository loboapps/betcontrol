import { createClient } from 'npm:@supabase/supabase-js'

interface BetRow {
  slip_ref: string | null
  bet_date: string
  description: string
  sport: string
  event_label: string | null
  total_buyin: number
  total_payout: number
  won: boolean
  gtd: boolean
  vendor: string
  api_input_tokens: number | null
  api_output_tokens: number | null
}

interface PlayerInput {
  player_id: string
  buyin: number
  payout: number
}

type RequestBody =
  | { action: 'save_bet'; admin_token: string; bet: BetRow; players: PlayerInput[] }
  | { action: 'update_deposits'; admin_token: string; deposits: Array<{ player_id: string; total_deposited: number }> }
  | { action: 'classify_events'; admin_token: string; classifications: Array<{ bet_id: string; event_label: string }> }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as RequestBody

    const adminToken = Deno.env.get('ADMIN_TOKEN')
    if (!adminToken || body.admin_token !== adminToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (body.action === 'save_bet') {
      const { data: bet, error: betError } = await supabase
        .from('bet_bets')
        .insert(body.bet)
        .select('id')
        .single()
      if (betError) throw betError

      const { error: playersError } = await supabase.from('bet_player_bets').insert(
        body.players.map((p) => ({
          bet_id: (bet as { id: string }).id,
          player_id: p.player_id,
          buyin: p.buyin,
          payout: p.payout,
        }))
      )
      if (playersError) throw playersError

      return new Response(
        JSON.stringify({ success: true, bet_id: (bet as { id: string }).id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'update_deposits') {
      for (const { player_id, total_deposited } of body.deposits) {
        const { error } = await supabase
          .from('bet_players')
          .update({ total_deposited })
          .eq('id', player_id)
        if (error) throw error
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'classify_events') {
      for (const { bet_id, event_label } of body.classifications) {
        const { error } = await supabase
          .from('bet_bets')
          .update({ event_label })
          .eq('id', bet_id)
        if (error) throw error
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
