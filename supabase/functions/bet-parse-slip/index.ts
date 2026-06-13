import Anthropic from 'npm:@anthropic-ai/sdk'

interface SlipRequestBody {
  admin_token: string
  image_base64: string
  vendor: string
}

interface ParsedSlip {
  slip_ref: string
  bet_date: string
  description: string
  total_buyin: number
  total_payout: number
  vendor: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as SlipRequestBody

    const adminToken = Deno.env.get('ADMIN_TOKEN')
    if (!adminToken || body.admin_token !== adminToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: body.image_base64,
              },
            },
            {
              type: 'text',
              text: `Parse this FanDuel bet slip image. Return ONLY valid JSON — no markdown, no explanation.

FIELD MAPPING:
- slip_ref: the BET ID in the header (e.g. "O/1141360/0001679"). Empty string if not visible.
- bet_date: date placed, format YYYY-MM-DD. If only time is visible use today's date.
- total_buyin: the "Wager" field value as a plain number (no $ sign).
- total_payout: the "Total payout" field value as a plain number (no $ sign).
- sport: always return empty string "".
- vendor: always "fanduel".
- description: structured multi-line text following the rules below.

DESCRIPTION RULES:
1. If it is a Same Game Parlay (SGP): first line = "SGP: [team1] v [team2]"
   If it is a regular parlay: first line = "Parlay"
   If it is a single bet: no header line.
2. Each selection (leg) gets its own line: "[player] [prop]"
3. Player name: abbreviate first name to initial only → "Christian Pulisic" becomes "C. Pulisic"
4. If a leg has NO visible player name: use "[?]" as the player placeholder.
5. Team bets (no individual player): use team abbreviation or short name.
6. Prop abbreviations:
   - "over" or "Over" → "o"  (e.g. "Over 1.5" → "o1.5")
   - "under" or "Under" → "u"  (e.g. "Under 2.5" → "u2.5")
   - "N or more X" → "N+ X"  (e.g. "1 or more shots on target" → "1+ Shots on target")
   - "to score" → "Score"
7. Capitalize stat names (e.g. "shots on target" → "Shots on target").

EXAMPLE — SGP with 2 legs, first player name not visible:
{
  "description": "SGP: USA v Paraguay\\n[?] o1+ Shots on target\\nC. Pulisic o1+ Shots on target"
}

Return this exact JSON shape:
{
  "slip_ref": "",
  "bet_date": "YYYY-MM-DD",
  "description": "",
  "total_buyin": 0,
  "total_payout": 0,
  "sport": "",
  "vendor": "fanduel"
}`,
            },
          ],
        },
      ],
    })

    const textBlock = message.content.find((c) => c.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from model')
    }

    let jsonText = textBlock.text.trim()
    const mdMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (mdMatch) jsonText = mdMatch[1].trim()
    const parsed = JSON.parse(jsonText) as ParsedSlip

    return new Response(
      JSON.stringify({
        data: parsed,
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
