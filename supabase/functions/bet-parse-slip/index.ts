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
              text: `Parse this FanDuel bet slip image. Return ONLY valid JSON — no markdown, no explanation:

{
  "slip_ref": "slip/ticket ID if visible, otherwise empty string",
  "bet_date": "YYYY-MM-DD date the bet was placed",
  "description": "full bet description — teams, players, bet type",
  "total_buyin": total amount wagered as a number without $ sign,
  "total_payout": potential payout if the bet wins as a number without $ sign,
  "vendor": "fanduel"
}

Use empty string for unreadable text and 0 for unreadable numbers.`,
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
