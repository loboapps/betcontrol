# BetControl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build BetControl — a web app for tracking group sports bets with FanDuel slip parsing via Claude AI, per-player P&L calculation, and analytics views by date and event.

**Architecture:** React 18 + TypeScript strict + Tailwind v4 on Vercel; Supabase PostgreSQL (project APT) as backend with all reads via JSONB RPC functions; admin writes via Supabase Edge Functions using service role key; slip parsing via Edge Function + Anthropic Haiku 4.5. No user auth — public read, admin via secret URL.

**Tech Stack:** React 18, React Router v6, TypeScript 5 (strict), Tailwind v4 (`@tailwindcss/vite`), Inter font (`@fontsource/inter`), `@supabase/supabase-js`, `lucide-react`, Vitest, Supabase Edge Functions (Deno), `npm:@anthropic-ai/sdk` (in Edge Functions)

---

## File Map

```
src/
  types/index.ts                    — all shared TypeScript types + SPORTS constant
  lib/
    supabase.ts                     — Supabase anon client singleton
    payout.ts                       — calculatePayout pure function
    clipboard.ts                    — WhatsApp copy text formatters
    __tests__/
      payout.test.ts                — payout formula unit tests
      clipboard.test.ts             — WhatsApp formatter unit tests
  hooks/
    useBets.ts                      — fetch bets for a date range
    usePorData.ts                   — fetch por data rows
    usePorEvento.ts                 — fetch por evento rows
    usePlayerSummary.ts             — fetch all players + P&L totals
    useUnclassifiedBets.ts          — fetch bets missing event_label
  components/
    ui/
      Button.tsx                    — primary / secondary variants
      Badge.tsx                     — sport pill (color per sport)
      Card.tsx                      — base card container
      Input.tsx                     — styled text input
    layout/
      Layout.tsx                    — page wrapper (renders TopNav or BottomNav)
      TopNav.tsx                    — desktop top nav (3 tabs)
      BottomNav.tsx                 — mobile fixed bottom tab bar
    bets/
      BetFilters.tsx                — date range picker + sport filter
      BetRow.tsx                    — single bet row + collapsible player breakdown
      BetList.tsx                   — list of BetRows + WhatsApp copy button
    analytics/
      PlayerSidebar.tsx             — player cards with P&L, click to filter
      PorDataTable.tsx              — date-grouped P&L rows
      PorEventoTable.tsx            — sport/event-grouped P&L rows
    admin/
      ManageDeposits.tsx            — inline edit of each player's total_deposited
      ClassifyBets.tsx              — batch event_label editor for unclassified bets
      SlipUpload.tsx                — image upload → parse → confirm form → save
  pages/
    Bets.tsx
    PorData.tsx
    PorEvento.tsx
    Admin.tsx
  App.tsx                           — router + routes
  main.tsx                          — React entry point
  index.css                         — Tailwind v4 + Inter font imports
  test/setup.ts                     — vitest + jest-dom setup
.supabase/
  tables/
    bc_players.sql
    bc_bets.sql
    bc_bet_players.sql
    rls_policies.sql
    seed_players.sql
  functions/
    bc_get_player_summary.sql
    bc_get_bets.sql
    bc_get_por_data.sql
    bc_get_por_evento.sql
    bc_get_unclassified_bets.sql
supabase/
  functions/
    bc-parse-slip/index.ts          — parse FanDuel image via Claude Haiku 4.5
    bc-admin/index.ts               — save_bet / update_deposits / classify_events
```

---

### Task 1: Project Scaffold + Dependencies + Git

**Files:**
- Creates: full Vite project scaffold
- Modifies: `vite.config.ts`, `tsconfig.json`, `src/index.css`
- Creates: `src/test/setup.ts`, `.env.local`

- [ ] **Step 1: Verify Node.js ≥ 18**

```bash
node --version
```

Expected: `v18.x.x` or higher. If missing → install LTS from https://nodejs.org

- [ ] **Step 2: Install GitHub CLI**

```bash
brew install gh
gh auth login
```

Follow the browser prompts to connect your GitHub account.

- [ ] **Step 3: Scaffold Vite project into existing folder**

```bash
cd /Users/wolfgang/Development/com.grillo.betcontrol
npm create vite@latest . -- --template react-ts
```

When asked "Current directory is not empty" → select **Ignore files and continue**.  
Framework → **React** · Variant → **TypeScript**

- [ ] **Step 4: Install all dependencies**

```bash
npm install
npm install react-router-dom @supabase/supabase-js lucide-react @fontsource/inter
npm install -D @tailwindcss/vite tailwindcss vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 5: Replace `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 6: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 7: Replace `src/index.css`**

```css
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";
@import "tailwindcss";
```

- [ ] **Step 8: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 9: Remove Vite boilerplate**

```bash
rm -f src/App.css src/assets/react.svg
```

- [ ] **Step 10: Create `.env.local`**

Get values from: Supabase Dashboard → Project APT → Settings → API

```
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

- [ ] **Step 11: Initialize git + GitHub repo**

```bash
git init
git add CLAUDE.md docs/ src/ public/ index.html package.json tsconfig.json tsconfig.node.json vite.config.ts .gitignore
git commit -m "feat: initial BetControl scaffold — React TypeScript Vite Tailwind"
gh repo create com.grillo.betcontrol --private --source=. --push
```

Expected: GitHub prints the repo URL.

---

### Task 2: TypeScript Types + Payout Formula + Tests

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/payout.ts`
- Create: `src/lib/__tests__/payout.test.ts`

- [ ] **Step 1: Write the failing payout test**

Create `src/lib/__tests__/payout.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculatePayout } from '../payout'

describe('calculatePayout', () => {
  it('GTD: always returns the player buyin regardless of won', () => {
    expect(calculatePayout({ buyin: 100, totalBuyin: 300, totalPayout: 900, won: false, gtd: true })).toBe(100)
    expect(calculatePayout({ buyin: 50,  totalBuyin: 300, totalPayout: 900, won: true,  gtd: true })).toBe(50)
  })

  it('Lost + not GTD: returns 0', () => {
    expect(calculatePayout({ buyin: 100, totalBuyin: 300, totalPayout: 900, won: false, gtd: false })).toBe(0)
  })

  it('Won: returns proportional share of total payout', () => {
    // 100/300 * 900 = 300
    expect(calculatePayout({ buyin: 100, totalBuyin: 300, totalPayout: 900, won: true, gtd: false })).toBeCloseTo(300)
    // 150/300 * 900 = 450
    expect(calculatePayout({ buyin: 150, totalBuyin: 300, totalPayout: 900, won: true, gtd: false })).toBeCloseTo(450)
    // Equal split: 100/200 * 400 = 200
    expect(calculatePayout({ buyin: 100, totalBuyin: 200, totalPayout: 400, won: true, gtd: false })).toBeCloseTo(200)
  })
})
```

- [ ] **Step 2: Run — confirm it fails**

```bash
npx vitest run src/lib/__tests__/payout.test.ts
```

Expected: `Cannot find module '../payout'`

- [ ] **Step 3: Create `src/lib/payout.ts`**

```typescript
interface PayoutArgs {
  buyin: number
  totalBuyin: number
  totalPayout: number
  won: boolean
  gtd: boolean
}

export function calculatePayout({ buyin, totalBuyin, totalPayout, won, gtd }: PayoutArgs): number {
  if (gtd) return buyin
  if (!won) return 0
  return (buyin / totalBuyin) * totalPayout
}
```

- [ ] **Step 4: Run — confirm all tests pass**

```bash
npx vitest run src/lib/__tests__/payout.test.ts
```

Expected: 3 test groups PASS.

- [ ] **Step 5: Create `src/types/index.ts`**

```typescript
export interface Player {
  id: string
  name: string
  display_order: number
  total_deposited: number
  net_pnl: number
  balance: number
}

export interface BetPlayer {
  player_id: string
  player_name: string
  buyin: number
  payout: number
  net: number
}

export interface Bet {
  id: string
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
  players: BetPlayer[]
}

export interface PorDataRow {
  bet_date: string
  group_buyin: number
  group_payout: number
  group_net: number
  bet_count: number
  players: BetPlayer[]
}

export interface PorEventoRow {
  sport: string
  event_label: string | null
  group_buyin: number
  group_payout: number
  group_net: number
  bet_count: number
  players: BetPlayer[]
}

export interface UnclassifiedBet {
  id: string
  bet_date: string
  description: string
  sport: string
  event_label: string | null
}

export interface ParsedSlip {
  slip_ref: string
  bet_date: string
  description: string
  total_buyin: number
  total_payout: number
  vendor: string
}

export const SPORTS = ['NFL', 'FIFA', 'NBA', 'MLB', 'NHL', 'Other'] as const
export type Sport = (typeof SPORTS)[number]
```

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/payout.ts src/lib/__tests__/payout.test.ts src/test/setup.ts
git commit -m "feat: TypeScript types + payout formula with unit tests"
```

---

### Task 3: Database Tables + RLS + Seed Players

Execute each SQL block via **Supabase Dashboard → SQL Editor → New query → Run**.

**Files:**
- Create: `.supabase/tables/bc_players.sql`
- Create: `.supabase/tables/bc_bets.sql`
- Create: `.supabase/tables/bc_bet_players.sql`
- Create: `.supabase/tables/rls_policies.sql`
- Create: `.supabase/tables/seed_players.sql`

- [ ] **Step 1: Create `bc_players` table**

Save to `.supabase/tables/bc_players.sql` and run in SQL Editor:

```sql
CREATE TABLE bc_players (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text           NOT NULL,
  display_order   int            NOT NULL DEFAULT 99,
  total_deposited numeric(10,2)  NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Create `bc_bets` table**

Save to `.supabase/tables/bc_bets.sql` and run:

```sql
CREATE TABLE bc_bets (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_ref          text,
  bet_date          date           NOT NULL,
  description       text           NOT NULL,
  sport             text           NOT NULL,
  event_label       text,
  total_buyin       numeric(10,2)  NOT NULL,
  total_payout      numeric(10,2)  NOT NULL,
  won               boolean        NOT NULL DEFAULT false,
  gtd               boolean        NOT NULL DEFAULT false,
  vendor            text           NOT NULL DEFAULT 'fanduel',
  api_input_tokens  int,
  api_output_tokens int
);
```

- [ ] **Step 3: Create `bc_bet_players` table**

Save to `.supabase/tables/bc_bet_players.sql` and run:

```sql
CREATE TABLE bc_bet_players (
  id         uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id     uuid           NOT NULL REFERENCES bc_bets(id) ON DELETE CASCADE,
  player_id  uuid           NOT NULL REFERENCES bc_players(id),
  buyin      numeric(10,2)  NOT NULL,
  payout     numeric(10,2)  NOT NULL
);
```

- [ ] **Step 4: Enable RLS**

Save to `.supabase/tables/rls_policies.sql` and run:

```sql
ALTER TABLE bc_players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bc_bets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bc_bet_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_players_public_read"     ON bc_players     FOR SELECT USING (true);
CREATE POLICY "bc_bets_public_read"        ON bc_bets        FOR SELECT USING (true);
CREATE POLICY "bc_bet_players_public_read" ON bc_bet_players FOR SELECT USING (true);
```

Note: writes are blocked for anon. Edge Functions use the service role key which bypasses RLS.

- [ ] **Step 5: Seed players**

Save to `.supabase/tables/seed_players.sql` and run:

```sql
INSERT INTO bc_players (name, display_order, total_deposited) VALUES
  ('Wolf',   1, 0),
  ('Choi',   2, 0),
  ('Felipe', 3, 0),
  ('Jo',     4, 0),
  ('Trigo',  5, 0),
  ('Hu',     6, 0),
  ('Bueno',  7, 0),
  ('Ninho',  8, 0);
```

- [ ] **Step 6: Verify**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'bc_%' ORDER BY table_name;
```

Expected: 3 rows — `bc_bet_players`, `bc_bets`, `bc_players`.

```sql
SELECT name, display_order FROM bc_players ORDER BY display_order;
```

Expected: 8 rows, Wolf first.

- [ ] **Step 7: Commit SQL files**

```bash
mkdir -p .supabase/tables .supabase/functions
git add .supabase/tables/
git commit -m "feat: database tables bc_players, bc_bets, bc_bet_players + RLS + seed"
```

---

### Task 4: RPC Functions

Execute each SQL block via Supabase Dashboard SQL Editor.

**Files:**
- Create: `.supabase/functions/bc_get_player_summary.sql`
- Create: `.supabase/functions/bc_get_bets.sql`
- Create: `.supabase/functions/bc_get_por_data.sql`
- Create: `.supabase/functions/bc_get_por_evento.sql`
- Create: `.supabase/functions/bc_get_unclassified_bets.sql`

- [ ] **Step 1: `bc_get_player_summary`**

Save to `.supabase/functions/bc_get_player_summary.sql` and run:

```sql
CREATE OR REPLACE FUNCTION bc_get_player_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',              p.id,
          'name',            p.name,
          'display_order',   p.display_order,
          'total_deposited', p.total_deposited,
          'net_pnl',         COALESCE(SUM(bp.payout - bp.buyin), 0),
          'balance',         p.total_deposited + COALESCE(SUM(bp.payout - bp.buyin), 0)
        )
        ORDER BY p.display_order
      )
      FROM bc_players p
      LEFT JOIN bc_bet_players bp ON bp.player_id = p.id
      GROUP BY p.id, p.name, p.display_order, p.total_deposited
    ),
    '[]'::jsonb
  );
END;
$$;
```

- [ ] **Step 2: `bc_get_bets`**

Save to `.supabase/functions/bc_get_bets.sql` and run:

```sql
CREATE OR REPLACE FUNCTION bc_get_bets(
  p_from date DEFAULT CURRENT_DATE - 30,
  p_to   date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',           b.id,
          'slip_ref',     b.slip_ref,
          'bet_date',     b.bet_date,
          'description',  b.description,
          'sport',        b.sport,
          'event_label',  b.event_label,
          'total_buyin',  b.total_buyin,
          'total_payout', b.total_payout,
          'won',          b.won,
          'gtd',          b.gtd,
          'vendor',       b.vendor,
          'players', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'player_id',   bp.player_id,
                'player_name', p.name,
                'buyin',       bp.buyin,
                'payout',      bp.payout,
                'net',         bp.payout - bp.buyin
              ) ORDER BY p.display_order
            ), '[]'::jsonb)
            FROM bc_bet_players bp
            JOIN bc_players p ON p.id = bp.player_id
            WHERE bp.bet_id = b.id
          )
        )
        ORDER BY b.bet_date DESC, b.id
      )
      FROM bc_bets b
      WHERE b.bet_date BETWEEN p_from AND p_to
    ),
    '[]'::jsonb
  );
END;
$$;
```

- [ ] **Step 3: `bc_get_por_data`**

Save to `.supabase/functions/bc_get_por_data.sql` and run:

```sql
CREATE OR REPLACE FUNCTION bc_get_por_data(
  p_from date DEFAULT CURRENT_DATE - 30,
  p_to   date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_data ORDER BY (row_data->>'bet_date') DESC)
      FROM (
        SELECT jsonb_build_object(
          'bet_date',     b.bet_date,
          'group_buyin',  SUM(b.total_buyin),
          'group_payout', SUM(
            CASE WHEN b.gtd THEN b.total_buyin
                 WHEN b.won THEN b.total_payout
                 ELSE 0 END
          ),
          'group_net', SUM(
            CASE WHEN b.gtd THEN 0
                 WHEN b.won THEN b.total_payout - b.total_buyin
                 ELSE -b.total_buyin END
          ),
          'bet_count', COUNT(*),
          'players', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'player_id',   p.id,
                'player_name', p.name,
                'buyin',       SUM(bp.buyin),
                'payout',      SUM(bp.payout),
                'net',         SUM(bp.payout - bp.buyin)
              ) ORDER BY p.display_order
            ), '[]'::jsonb)
            FROM bc_bet_players bp
            JOIN bc_players p ON p.id = bp.player_id
            WHERE bp.bet_id IN (
              SELECT id FROM bc_bets b2
              WHERE b2.bet_date = b.bet_date
                AND b2.bet_date BETWEEN p_from AND p_to
            )
            GROUP BY p.id, p.name, p.display_order
          )
        ) AS row_data
        FROM bc_bets b
        WHERE b.bet_date BETWEEN p_from AND p_to
        GROUP BY b.bet_date
      ) sub
    ),
    '[]'::jsonb
  );
END;
$$;
```

- [ ] **Step 4: `bc_get_por_evento`**

Save to `.supabase/functions/bc_get_por_evento.sql` and run:

```sql
CREATE OR REPLACE FUNCTION bc_get_por_evento(p_sport text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_data)
      FROM (
        SELECT jsonb_build_object(
          'sport',        b.sport,
          'event_label',  b.event_label,
          'group_buyin',  SUM(b.total_buyin),
          'group_payout', SUM(
            CASE WHEN b.gtd THEN b.total_buyin
                 WHEN b.won THEN b.total_payout
                 ELSE 0 END
          ),
          'group_net', SUM(
            CASE WHEN b.gtd THEN 0
                 WHEN b.won THEN b.total_payout - b.total_buyin
                 ELSE -b.total_buyin END
          ),
          'bet_count', COUNT(*),
          'players', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'player_id',   p.id,
                'player_name', p.name,
                'buyin',       SUM(bp.buyin),
                'payout',      SUM(bp.payout),
                'net',         SUM(bp.payout - bp.buyin)
              ) ORDER BY p.display_order
            ), '[]'::jsonb)
            FROM bc_bet_players bp
            JOIN bc_players p ON p.id = bp.player_id
            WHERE bp.bet_id IN (
              SELECT id FROM bc_bets b2
              WHERE b2.sport = b.sport
                AND (b2.event_label IS NOT DISTINCT FROM b.event_label)
                AND (p_sport IS NULL OR b2.sport = p_sport)
            )
            GROUP BY p.id, p.name, p.display_order
          )
        ) AS row_data
        FROM bc_bets b
        WHERE (p_sport IS NULL OR b.sport = p_sport)
        GROUP BY b.sport, b.event_label
        ORDER BY b.sport, b.event_label NULLS LAST
      ) sub
    ),
    '[]'::jsonb
  );
END;
$$;
```

- [ ] **Step 5: `bc_get_unclassified_bets`**

Save to `.supabase/functions/bc_get_unclassified_bets.sql` and run:

```sql
CREATE OR REPLACE FUNCTION bc_get_unclassified_bets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          b.id,
          'bet_date',    b.bet_date,
          'description', b.description,
          'sport',       b.sport,
          'event_label', b.event_label
        )
        ORDER BY b.bet_date DESC
      )
      FROM bc_bets b
      WHERE b.event_label IS NULL
    ),
    '[]'::jsonb
  );
END;
$$;
```

- [ ] **Step 6: Verify all 5 functions**

```sql
SELECT bc_get_player_summary();
SELECT bc_get_bets();
SELECT bc_get_por_data();
SELECT bc_get_por_evento();
SELECT bc_get_unclassified_bets();
```

Expected: each returns `[]` (no data yet — that's correct).

- [ ] **Step 7: Commit**

```bash
git add .supabase/functions/
git commit -m "feat: RPC functions — bets, por_data, por_evento, player_summary, unclassified"
```

---

### Task 5: Edge Functions

**Files:**
- Create: `supabase/functions/bc-parse-slip/index.ts`
- Create: `supabase/functions/bc-admin/index.ts`

- [ ] **Step 1: Install Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase login
```

- [ ] **Step 2: Link to project APT**

Get Reference ID from: Supabase Dashboard → Project APT → Settings → General → Reference ID

```bash
supabase link --project-ref [REFERENCE_ID]
```

- [ ] **Step 3: Create `supabase/functions/bc-parse-slip/index.ts`**

```typescript
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

    const parsed = JSON.parse(textBlock.text) as ParsedSlip

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
```

- [ ] **Step 4: Create `supabase/functions/bc-admin/index.ts`**

```typescript
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
        .from('bc_bets')
        .insert(body.bet)
        .select('id')
        .single()
      if (betError) throw betError

      const { error: playersError } = await supabase.from('bc_bet_players').insert(
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
          .from('bc_players')
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
          .from('bc_bets')
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
```

- [ ] **Step 5: Deploy both functions**

```bash
supabase functions deploy bc-parse-slip
supabase functions deploy bc-admin
```

Expected: each prints "Deployed Function ... successfully."

- [ ] **Step 6: Set secrets**

Generate a random admin token (save the output — you'll need it for the admin URL):

```bash
openssl rand -hex 32
```

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-[your key]
supabase secrets set ADMIN_TOKEN=[output from openssl above]
```

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: Edge Functions — bc-parse-slip (Claude Haiku 4.5) + bc-admin (writes)"
```

---

### Task 6: Supabase Client + Data Hooks

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/hooks/usePlayerSummary.ts`
- Create: `src/hooks/useBets.ts`
- Create: `src/hooks/usePorData.ts`
- Create: `src/hooks/usePorEvento.ts`
- Create: `src/hooks/useUnclassifiedBets.ts`

- [ ] **Step 1: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Create `src/hooks/usePlayerSummary.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Player } from '../types'

export function usePlayerSummary() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .rpc('bc_get_player_summary')
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setPlayers((data as Player[] | null) ?? [])
        setLoading(false)
      })
  }, [])

  return { players, loading, error }
}
```

- [ ] **Step 3: Create `src/hooks/useBets.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Bet } from '../types'

export function useBets(from: string, to: string) {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bc_get_bets', { p_from: from, p_to: to })
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setBets((data as Bet[] | null) ?? [])
        setLoading(false)
      })
  }, [from, to])

  return { bets, loading, error }
}
```

- [ ] **Step 4: Create `src/hooks/usePorData.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { PorDataRow } from '../types'

export function usePorData(from: string, to: string) {
  const [rows, setRows] = useState<PorDataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bc_get_por_data', { p_from: from, p_to: to })
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setRows((data as PorDataRow[] | null) ?? [])
        setLoading(false)
      })
  }, [from, to])

  return { rows, loading, error }
}
```

- [ ] **Step 5: Create `src/hooks/usePorEvento.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { PorEventoRow } from '../types'

export function usePorEvento(sport: string | null) {
  const [rows, setRows] = useState<PorEventoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bc_get_por_evento', { p_sport: sport })
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setRows((data as PorEventoRow[] | null) ?? [])
        setLoading(false)
      })
  }, [sport])

  return { rows, loading, error }
}
```

- [ ] **Step 6: Create `src/hooks/useUnclassifiedBets.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UnclassifiedBet } from '../types'

export function useUnclassifiedBets() {
  const [bets, setBets] = useState<UnclassifiedBet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    supabase
      .rpc('bc_get_unclassified_bets')
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message)
        else setBets((data as UnclassifiedBet[] | null) ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  return { bets, loading, error, reload: load }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts src/hooks/
git commit -m "feat: Supabase client + data hooks (bets, por data, por evento, players)"
```

---

### Task 7: Design System UI Components

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Input.tsx`

- [ ] **Step 1: Create `src/components/ui/Button.tsx`**

```typescript
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const base = 'px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer'
  const variants = {
    primary:   'bg-amber-500 hover:bg-amber-400 text-zinc-900',
    secondary: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
    ghost:     'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create `src/components/ui/Badge.tsx`**

```typescript
interface BadgeProps {
  sport: string
  className?: string
}

const sportColors: Record<string, string> = {
  NFL:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  FIFA:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NBA:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  MLB:   'bg-red-500/20 text-red-400 border-red-500/30',
  NHL:   'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Other: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30',
}

export function Badge({ sport, className = '' }: BadgeProps) {
  const colors = sportColors[sport] ?? sportColors['Other']
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors} ${className}`}>
      {sport}
    </span>
  )
}
```

- [ ] **Step 3: Create `src/components/ui/Card.tsx`**

```typescript
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-zinc-800 rounded-lg border border-zinc-700 ${className}`} {...props}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/ui/Input.tsx`**

```typescript
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-zinc-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: design system components — Button, Badge, Card, Input"
```

---

### Task 8: Layout Components

**Files:**
- Create: `src/components/layout/TopNav.tsx`
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/components/layout/Layout.tsx`

- [ ] **Step 1: Create `src/components/layout/TopNav.tsx`**

```typescript
import { NavLink } from 'react-router-dom'
import { BarChart2, Calendar, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/',           label: 'Bets',       icon: BarChart2 },
  { to: '/por-data',   label: 'Por data',   icon: Calendar  },
  { to: '/por-evento', label: 'Por evento', icon: TrendingUp },
]

export function TopNav() {
  return (
    <nav className="hidden md:flex items-center gap-1 bg-zinc-900 border-b border-zinc-800 px-6 h-14 sticky top-0 z-10">
      <span className="text-amber-500 font-bold text-lg mr-6">BetControl</span>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-zinc-800 text-amber-500'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/BottomNav.tsx`**

```typescript
import { NavLink } from 'react-router-dom'
import { BarChart2, Calendar, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/',           label: 'Bets',       icon: BarChart2 },
  { to: '/por-data',   label: 'Por data',   icon: Calendar  },
  { to: '/por-evento', label: 'Por evento', icon: TrendingUp },
]

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex z-10">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-2 gap-1 text-xs font-medium transition-colors ${
              isActive ? 'text-amber-500' : 'text-zinc-500'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Create `src/components/layout/Layout.tsx`**

```typescript
import type { ReactNode } from 'react'
import { TopNav } from './TopNav'
import { BottomNav } from './BottomNav'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <TopNav />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "feat: layout components — TopNav (desktop) + BottomNav (mobile)"
```

---

### Task 9: WhatsApp Formatter + Tests

**Files:**
- Create: `src/lib/clipboard.ts`
- Create: `src/lib/__tests__/clipboard.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/clipboard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatBRL, porDataToWhatsApp } from '../clipboard'
import type { PorDataRow } from '../../types'

describe('formatBRL', () => {
  it('formats positive value with + sign', () => {
    expect(formatBRL(160)).toBe('+R$ 160,00')
  })
  it('formats negative value with - sign', () => {
    expect(formatBRL(-50)).toBe('-R$ 50,00')
  })
  it('formats zero without sign', () => {
    expect(formatBRL(0)).toBe('R$ 0,00')
  })
})

describe('porDataToWhatsApp', () => {
  const rows: PorDataRow[] = [
    {
      bet_date: '2024-11-10',
      group_buyin: 300,
      group_payout: 460,
      group_net: 160,
      bet_count: 2,
      players: [
        { player_id: '1', player_name: 'Wolf',  buyin: 150, payout: 230, net: 80  },
        { player_id: '2', player_name: 'Choi',  buyin: 150, payout: 230, net: 80  },
      ],
    },
  ]

  it('includes date range in header', () => {
    const text = porDataToWhatsApp(rows, '2024-11-10', '2024-11-10', null)
    expect(text).toContain('10/11')
  })

  it('includes group totals', () => {
    const text = porDataToWhatsApp(rows, '2024-11-10', '2024-11-10', null)
    expect(text).toContain('300,00')
    expect(text).toContain('+R$ 160,00')
  })

  it('includes all player names when no player selected', () => {
    const text = porDataToWhatsApp(rows, '2024-11-10', '2024-11-10', null)
    expect(text).toContain('Wolf')
    expect(text).toContain('Choi')
  })
})
```

- [ ] **Step 2: Run — confirm fails**

```bash
npx vitest run src/lib/__tests__/clipboard.test.ts
```

Expected: `Cannot find module '../clipboard'`

- [ ] **Step 3: Create `src/lib/clipboard.ts`**

```typescript
import type { PorDataRow, PorEventoRow } from '../types'

export function formatBRL(value: number): string {
  const abs = Math.abs(value).toFixed(2).replace('.', ',')
  if (value > 0) return `+R$ ${abs}`
  if (value < 0) return `-R$ ${abs}`
  return `R$ ${abs}`
}

function brl(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

export function porDataToWhatsApp(
  rows: PorDataRow[],
  from: string,
  to: string,
  selectedPlayerId: string | null
): string {
  const groupBuyin  = rows.reduce((s, r) => s + r.group_buyin, 0)
  const groupPayout = rows.reduce((s, r) => s + r.group_payout, 0)
  const groupNet    = rows.reduce((s, r) => s + r.group_net, 0)

  const fromLabel = formatDate(from)
  const toLabel   = formatDate(to)
  const dateRange = fromLabel === toLabel ? fromLabel : `${fromLabel} a ${toLabel}`

  let text = `📊 BetControl — ${dateRange}\n\n`
  text += `💰 Grupo\n`
  text += `Investido: ${brl(groupBuyin)}\n`
  text += `Retorno:   ${brl(groupPayout)}\n`
  text += `Lucro:     ${formatBRL(groupNet)}\n`

  const playerMap = new Map<string, { name: string; buyin: number; payout: number; net: number }>()
  for (const row of rows) {
    for (const p of row.players) {
      if (selectedPlayerId && p.player_id !== selectedPlayerId) continue
      const existing = playerMap.get(p.player_id)
      if (existing) {
        existing.buyin  += p.buyin
        existing.payout += p.payout
        existing.net    += p.net
      } else {
        playerMap.set(p.player_id, { name: p.player_name, buyin: p.buyin, payout: p.payout, net: p.net })
      }
    }
  }

  for (const [, player] of playerMap) {
    text += `\n👤 ${player.name}\n`
    text += `Investido: ${brl(player.buyin)}\n`
    text += `Retorno:   ${brl(player.payout)}\n`
    text += `Lucro:     ${formatBRL(player.net)}\n`
  }

  return text
}

export function porEventoToWhatsApp(
  rows: PorEventoRow[],
  sport: string | null,
  selectedPlayerId: string | null
): string {
  const groupBuyin  = rows.reduce((s, r) => s + r.group_buyin, 0)
  const groupPayout = rows.reduce((s, r) => s + r.group_payout, 0)
  const groupNet    = rows.reduce((s, r) => s + r.group_net, 0)

  const label = sport ? sport : 'Todos os esportes'
  let text = `📊 BetControl — Por Evento (${label})\n\n`
  text += `💰 Grupo\n`
  text += `Investido: ${brl(groupBuyin)}\n`
  text += `Retorno:   ${brl(groupPayout)}\n`
  text += `Lucro:     ${formatBRL(groupNet)}\n`

  for (const row of rows) {
    const eventName = row.event_label ? `${row.sport} — ${row.event_label}` : row.sport
    text += `\n📌 ${eventName} (${row.bet_count} bet${row.bet_count !== 1 ? 's' : ''})\n`
    text += `Investido: ${brl(row.group_buyin)}\n`
    text += `Lucro:     ${formatBRL(row.group_net)}\n`

    if (selectedPlayerId) {
      const player = row.players.find((p) => p.player_id === selectedPlayerId)
      if (player) {
        text += `${player.player_name}: ${formatBRL(player.net)}\n`
      }
    }
  }

  return text
}
```

- [ ] **Step 4: Run — confirm tests pass**

```bash
npx vitest run src/lib/__tests__/clipboard.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clipboard.ts src/lib/__tests__/clipboard.test.ts
git commit -m "feat: WhatsApp copy formatters with unit tests"
```

---

### Task 10: Bets Screen

**Files:**
- Create: `src/components/bets/BetFilters.tsx`
- Create: `src/components/bets/BetRow.tsx`
- Create: `src/components/bets/BetList.tsx`
- Create: `src/pages/Bets.tsx`

- [ ] **Step 1: Create `src/components/bets/BetFilters.tsx`**

```typescript
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
```

- [ ] **Step 2: Create `src/components/bets/BetRow.tsx`**

```typescript
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/Badge'
import type { Bet } from '../../types'

interface BetRowProps {
  bet: Bet
}

function formatBetDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

function statusLabel(bet: Bet): { text: string; className: string } {
  if (bet.gtd) return { text: 'GTD',   className: 'text-zinc-400'   }
  if (bet.won) return { text: 'WIN',   className: 'text-emerald-400' }
  return          { text: 'LOSS',  className: 'text-rose-400'    }
}

export function BetRow({ bet }: BetRowProps) {
  const [expanded, setExpanded] = useState(false)
  const status = statusLabel(bet)

  return (
    <div className="border-b border-zinc-700 last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/30 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={16} className="text-zinc-500 shrink-0" /> : <ChevronRight size={16} className="text-zinc-500 shrink-0" />}
        <span className="text-zinc-400 text-sm w-16 shrink-0">{formatBetDate(bet.bet_date)}</span>
        <Badge sport={bet.sport} className="shrink-0" />
        <span className="text-zinc-100 text-sm flex-1 truncate">{bet.description}</span>
        <span className={`text-sm font-mono tabular-nums shrink-0 ${status.className}`}>{status.text}</span>
        <span className="text-zinc-400 text-sm font-mono tabular-nums w-20 text-right shrink-0">
          R$ {bet.total_buyin.toFixed(2).replace('.', ',')}
        </span>
      </button>
      {expanded && (
        <div className="px-9 pb-3">
          <div className="bg-zinc-900 rounded-lg p-3">
            {bet.event_label && (
              <p className="text-xs text-zinc-500 mb-2">{bet.event_label}</p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs">
                  <th className="text-left pb-1">Jogador</th>
                  <th className="text-right pb-1">Buyin</th>
                  <th className="text-right pb-1">Payout</th>
                  <th className="text-right pb-1">Net</th>
                </tr>
              </thead>
              <tbody>
                {bet.players.map((p) => (
                  <tr key={p.player_id} className="text-zinc-300">
                    <td className="py-0.5">{p.player_name}</td>
                    <td className="text-right font-mono tabular-nums">R$ {p.buyin.toFixed(2).replace('.', ',')}</td>
                    <td className="text-right font-mono tabular-nums">R$ {p.payout.toFixed(2).replace('.', ',')}</td>
                    <td className={`text-right font-mono tabular-nums ${p.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.net >= 0 ? '+' : ''}R$ {p.net.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/bets/BetList.tsx`**

```typescript
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
```

- [ ] **Step 4: Create `src/pages/Bets.tsx`**

```typescript
import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { BetFilters } from '../components/bets/BetFilters'
import { BetList } from '../components/bets/BetList'
import { useBets } from '../hooks/useBets'
import { porDataToWhatsApp } from '../lib/clipboard'
import type { PorDataRow } from '../types'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function sevenDaysAgoISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

export function Bets() {
  const [from, setFrom] = useState(sevenDaysAgoISO)
  const [to, setTo]     = useState(todayISO)
  const [sport, setSport] = useState('')

  const { bets, loading } = useBets(from, to)

  const filtered = sport ? bets.filter((b) => b.sport === sport) : bets

  function handleCopyWhatsApp() {
    // Summarize filtered bets as por-data rows for formatting
    const byDate = new Map<string, PorDataRow>()
    for (const bet of filtered) {
      const row = byDate.get(bet.bet_date) ?? {
        bet_date: bet.bet_date,
        group_buyin: 0,
        group_payout: 0,
        group_net: 0,
        bet_count: 0,
        players: [],
      }
      const effectivePayout = bet.gtd ? bet.total_buyin : bet.won ? bet.total_payout : 0
      row.group_buyin  += bet.total_buyin
      row.group_payout += effectivePayout
      row.group_net    += effectivePayout - bet.total_buyin
      row.bet_count    += 1
      for (const p of bet.players) {
        const existing = row.players.find((rp) => rp.player_id === p.player_id)
        if (existing) {
          existing.buyin  += p.buyin
          existing.payout += p.payout
          existing.net    += p.net
        } else {
          row.players.push({ ...p })
        }
      }
      byDate.set(bet.bet_date, row)
    }
    const rows = Array.from(byDate.values()).sort((a, b) => b.bet_date.localeCompare(a.bet_date))
    const text = porDataToWhatsApp(rows, from, to, null)
    navigator.clipboard.writeText(text)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <BetFilters
          from={from} to={to} sport={sport}
          onFromChange={setFrom} onToChange={setTo} onSportChange={setSport}
        />
        <BetList bets={filtered} loading={loading} onCopyWhatsApp={handleCopyWhatsApp} />
      </div>
    </Layout>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/bets/ src/pages/Bets.tsx
git commit -m "feat: Bets screen — filters, row expand, player breakdown"
```

---

### Task 11: Player Sidebar + Por Data Screen

**Files:**
- Create: `src/components/analytics/PlayerSidebar.tsx`
- Create: `src/components/analytics/PorDataTable.tsx`
- Create: `src/pages/PorData.tsx`

- [ ] **Step 1: Create `src/components/analytics/PlayerSidebar.tsx`**

```typescript
import { Card } from '../ui/Card'
import { formatBRL } from '../../lib/clipboard'
import type { Player } from '../../types'

interface PlayerSidebarProps {
  players: Player[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function PlayerSidebar({ players, loading, selectedId, onSelect }: PlayerSidebarProps) {
  if (loading) return <div className="w-48 shrink-0 text-zinc-500 text-sm p-4">Carregando...</div>

  return (
    <div className="w-full md:w-52 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible px-4 md:px-0 pb-2 md:pb-0">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 md:w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
          selectedId === null
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'text-zinc-400 hover:bg-zinc-800'
        }`}
      >
        Todos
      </button>
      {players.map((player) => (
        <Card
          key={player.id}
          onClick={() => onSelect(selectedId === player.id ? null : player.id)}
          className={`shrink-0 p-3 cursor-pointer transition-colors hover:border-amber-500/50 ${
            selectedId === player.id ? 'border-amber-500/50 bg-amber-500/5' : ''
          }`}
        >
          <p className="font-semibold text-zinc-100 text-sm">{player.name}</p>
          <p className={`text-xs font-mono tabular-nums mt-1 ${player.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatBRL(player.net_pnl)}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Saldo: R$ {player.balance.toFixed(2).replace('.', ',')}
          </p>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/analytics/PorDataTable.tsx`**

```typescript
import { Card } from '../ui/Card'
import { formatBRL } from '../../lib/clipboard'
import type { PorDataRow } from '../../types'

interface PorDataTableProps {
  rows: PorDataRow[]
  loading: boolean
  selectedPlayerId: string | null
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

export function PorDataTable({ rows, loading, selectedPlayerId }: PorDataTableProps) {
  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>
  if (rows.length === 0) return <div className="p-8 text-center text-zinc-500">Nenhum dado encontrado.</div>

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const playerData = selectedPlayerId
          ? row.players.find((p) => p.player_id === selectedPlayerId)
          : null

        return (
          <Card key={row.bet_date} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-100">{formatDate(row.bet_date)}</span>
              <span className="text-xs text-zinc-500">{row.bet_count} bet{row.bet_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-zinc-500 text-xs">Investido</p>
                <p className="font-mono tabular-nums text-zinc-200">
                  R$ {(playerData ? playerData.buyin : row.group_buyin).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Retorno</p>
                <p className="font-mono tabular-nums text-zinc-200">
                  R$ {(playerData ? playerData.payout : row.group_payout).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Lucro</p>
                <p className={`font-mono tabular-nums font-semibold ${
                  (playerData ? playerData.net : row.group_net) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatBRL(playerData ? playerData.net : row.group_net)}
                </p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/pages/PorData.tsx`**

```typescript
import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { PlayerSidebar } from '../components/analytics/PlayerSidebar'
import { PorDataTable } from '../components/analytics/PorDataTable'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Copy } from 'lucide-react'
import { usePorData } from '../hooks/usePorData'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { porDataToWhatsApp } from '../lib/clipboard'

function todayISO() { return new Date().toISOString().slice(0, 10) }
function thirtyDaysAgoISO() {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10)
}

export function PorData() {
  const [from, setFrom]             = useState(thirtyDaysAgoISO)
  const [to, setTo]                 = useState(todayISO)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { rows, loading: dataLoading }     = usePorData(from, to)
  const { players, loading: playersLoading } = usePlayerSummary()

  function handleCopy() {
    const text = porDataToWhatsApp(rows, from, to, selectedId)
    navigator.clipboard.writeText(text)
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <Input type="date" label="De"   value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <Input type="date" label="Até"  value={to}   onChange={(e) => setTo(e.target.value)}   className="w-36" />
          <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-2 mb-0.5">
            <Copy size={14} /> Copiar WhatsApp
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <PlayerSidebar
            players={players}
            loading={playersLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="flex-1">
            <PorDataTable rows={rows} loading={dataLoading} selectedPlayerId={selectedId} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/PlayerSidebar.tsx src/components/analytics/PorDataTable.tsx src/pages/PorData.tsx
git commit -m "feat: Por Data screen — date-grouped P&L + player sidebar filter"
```

---

### Task 12: Por Evento Screen

**Files:**
- Create: `src/components/analytics/PorEventoTable.tsx`
- Create: `src/pages/PorEvento.tsx`

- [ ] **Step 1: Create `src/components/analytics/PorEventoTable.tsx`**

```typescript
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatBRL } from '../../lib/clipboard'
import type { PorEventoRow } from '../../types'

interface PorEventoTableProps {
  rows: PorEventoRow[]
  loading: boolean
  selectedPlayerId: string | null
}

export function PorEventoTable({ rows, loading, selectedPlayerId }: PorEventoTableProps) {
  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>
  if (rows.length === 0) return <div className="p-8 text-center text-zinc-500">Nenhum dado encontrado.</div>

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const key = `${row.sport}-${row.event_label ?? 'none'}`
        const playerData = selectedPlayerId
          ? row.players.find((p) => p.player_id === selectedPlayerId)
          : null

        return (
          <Card key={key} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge sport={row.sport} />
              {row.event_label && (
                <span className="text-zinc-300 text-sm font-medium">{row.event_label}</span>
              )}
              <span className="text-zinc-500 text-xs ml-auto">{row.bet_count} bet{row.bet_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-zinc-500 text-xs">Investido</p>
                <p className="font-mono tabular-nums text-zinc-200">
                  R$ {(playerData ? playerData.buyin : row.group_buyin).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Retorno</p>
                <p className="font-mono tabular-nums text-zinc-200">
                  R$ {(playerData ? playerData.payout : row.group_payout).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Lucro</p>
                <p className={`font-mono tabular-nums font-semibold ${
                  (playerData ? playerData.net : row.group_net) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatBRL(playerData ? playerData.net : row.group_net)}
                </p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/pages/PorEvento.tsx`**

```typescript
import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { PlayerSidebar } from '../components/analytics/PlayerSidebar'
import { PorEventoTable } from '../components/analytics/PorEventoTable'
import { Button } from '../components/ui/Button'
import { Copy } from 'lucide-react'
import { usePorEvento } from '../hooks/usePorEvento'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { porEventoToWhatsApp } from '../lib/clipboard'
import { SPORTS } from '../types'

export function PorEvento() {
  const [sport, setSport]           = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { rows, loading: dataLoading }       = usePorEvento(sport)
  const { players, loading: playersLoading } = usePlayerSummary()

  function handleCopy() {
    const text = porEventoToWhatsApp(rows, sport, selectedId)
    navigator.clipboard.writeText(text)
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setSport(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sport === null ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Todos
          </button>
          {SPORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sport === s ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {s}
            </button>
          ))}
          <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-2 ml-auto">
            <Copy size={14} /> Copiar WhatsApp
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <PlayerSidebar
            players={players}
            loading={playersLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="flex-1">
            <PorEventoTable rows={rows} loading={dataLoading} selectedPlayerId={selectedId} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/PorEventoTable.tsx src/pages/PorEvento.tsx
git commit -m "feat: Por Evento screen — sport/event P&L with player sidebar filter"
```

---

### Task 13: Admin — Manage Deposits

**Files:**
- Create: `src/components/admin/ManageDeposits.tsx`

- [ ] **Step 1: Create `src/components/admin/ManageDeposits.tsx`**

```typescript
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

    await fetch(`${supabaseFunctionUrl}/bc-admin`, {
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
      <Button onClick={handleSave} disabled={saving || Object.keys(deposits).length === 0}>
        {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Depósitos'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/ManageDeposits.tsx
git commit -m "feat: admin ManageDeposits — inline edit player total_deposited"
```

---

### Task 14: Admin — Classify Events

**Files:**
- Create: `src/components/admin/ClassifyBets.tsx`

- [ ] **Step 1: Create `src/components/admin/ClassifyBets.tsx`**

```typescript
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

    await fetch(`${supabaseFunctionUrl}/bc-admin`, {
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
        onClick={handleSave}
        disabled={saving || Object.values(labels).every((v) => v.trim() === '')}
      >
        {saving ? 'Salvando...' : 'Salvar Classificações'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/ClassifyBets.tsx
git commit -m "feat: admin ClassifyBets — batch event_label editor"
```

---

### Task 15: Admin — Upload Slip

**Files:**
- Create: `src/components/admin/SlipUpload.tsx`

- [ ] **Step 1: Create `src/components/admin/SlipUpload.tsx`**

```typescript
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

const EMPTY_FORM: Omit<ParsedSlip, 'vendor'> & { sport: string; won: boolean; gtd: boolean; vendor: string } = {
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
  const [parsing, setParsing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [allocations, setAllocations] = useState<PlayerAllocation[]>([])

  // Sync allocations when players prop loads (useState initializer only runs once)
  useEffect(() => {
    setAllocations(players.map((p) => ({ player_id: p.id, name: p.name, buyin: '' })))
  }, [players])
  const [inputTokens, setInputTokens]   = useState<number | null>(null)
  const [outputTokens, setOutputTokens] = useState<number | null>(null)

  async function handleParse() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setParsing(true)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch(`${supabaseFunctionUrl}/bc-parse-slip`, {
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

    await fetch(`${supabaseFunctionUrl}/bc-admin`, {
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
    if (fileRef.current) fileRef.current.value = ''
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-zinc-100 font-semibold text-lg">Upload de Slip</h2>

      {/* Image upload */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" id="slip-file" />
          <label
            htmlFor="slip-file"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-100 text-sm font-medium cursor-pointer transition-colors"
          >
            <Upload size={16} /> Selecionar imagem
          </label>
          <Button onClick={handleParse} disabled={parsing} variant="secondary">
            {parsing ? 'Analisando...' : 'Parsear Slip'}
          </Button>
          {inputTokens !== null && (
            <span className="text-zinc-500 text-xs">
              {inputTokens + (outputTokens ?? 0)} tokens usados
            </span>
          )}
        </div>
        {parseError && <p className="text-rose-400 text-sm mt-2">{parseError}</p>}
      </Card>

      {/* Bet form */}
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

      {/* Player allocations */}
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
        onClick={handleSave}
        disabled={saving || !form.description || form.total_buyin <= 0}
        className="flex items-center gap-2"
      >
        {saved ? <><CheckCircle size={16} /> Salvo!</> : saving ? 'Salvando...' : 'Confirmar e Salvar'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/SlipUpload.tsx
git commit -m "feat: admin SlipUpload — image parse via Edge Function + confirm form + save"
```

---

### Task 16: Admin Page + Routing

**Files:**
- Create: `src/pages/Admin.tsx`
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/pages/Admin.tsx`**

```typescript
import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { SlipUpload } from '../components/admin/SlipUpload'
import { ClassifyBets } from '../components/admin/ClassifyBets'
import { ManageDeposits } from '../components/admin/ManageDeposits'
import { usePlayerSummary } from '../hooks/usePlayerSummary'

const SUPABASE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`

type AdminSection = 'upload' | 'classify' | 'deposits'

export function Admin() {
  const { token } = useParams<{ token: string }>()
  const [section, setSection] = useState<AdminSection>('upload')
  const { players } = usePlayerSummary()

  if (!token) return <Navigate to="/" replace />

  const tabs: { key: AdminSection; label: string }[] = [
    { key: 'upload',   label: 'Upload Slip'   },
    { key: 'classify', label: 'Classificar'   },
    { key: 'deposits', label: 'Depósitos'     },
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
        {section === 'upload'   && <SlipUpload    adminToken={token} supabaseFunctionUrl={SUPABASE_FUNCTION_URL} players={players} />}
        {section === 'classify' && <ClassifyBets  adminToken={token} supabaseFunctionUrl={SUPABASE_FUNCTION_URL} />}
        {section === 'deposits' && <ManageDeposits adminToken={token} supabaseFunctionUrl={SUPABASE_FUNCTION_URL} />}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 2: Create `src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Bets }      from './pages/Bets'
import { PorData }   from './pages/PorData'
import { PorEvento } from './pages/PorEvento'
import { Admin }     from './pages/Admin'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<Bets />}     />
        <Route path="/por-data"            element={<PorData />}  />
        <Route path="/por-evento"          element={<PorEvento />}/>
        <Route path="/admin/:token"        element={<Admin />}    />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Replace `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Run the dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173` — verify:
- Bets screen loads (empty state expected)
- Navigation works on desktop (top) and mobile (bottom tabs)
- `/admin/[YOUR_ADMIN_TOKEN]` shows the 3 admin tabs

Run TypeScript check:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx src/pages/Admin.tsx src/components/admin/
git commit -m "feat: Admin page (upload/classify/deposits) + App routing"
```

---

### Task 17: Vercel Deployment

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
vercel login
```

- [ ] **Step 2: Create `vercel.json`** (required for client-side routing)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel --prod
```

Follow the prompts:
- "Set up and deploy" → Yes
- "Which scope" → your personal account
- "Link to existing project?" → No
- "Project name" → `betcontrol` (or similar)
- "Which directory is your code?" → `.` (current directory)
- "Override settings?" → No

- [ ] **Step 4: Set environment variables on Vercel**

In Vercel Dashboard → Project → Settings → Environment Variables, add:

```
VITE_SUPABASE_URL     = https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY = [your anon key]
```

- [ ] **Step 5: Redeploy with env vars**

```bash
vercel --prod
```

- [ ] **Step 6: Test the production URL**

Open the Vercel URL — verify:
- Home page loads
- Nav works
- Admin URL: `[your-vercel-url]/admin/[YOUR_ADMIN_TOKEN]`

- [ ] **Step 7: Commit vercel.json**

```bash
git add vercel.json
git commit -m "feat: Vercel deployment config for client-side routing"
git push
```

- [ ] **Step 8: Connect GitHub to Vercel for auto-deploy (optional)**

In Vercel Dashboard → Project → Settings → Git → Connect Git Repository → select `com.grillo.betcontrol`

From this point, every `git push` to main will trigger a new Vercel deployment automatically.

---

## Running All Tests

```bash
npx vitest run
```

Expected: all tests in `src/lib/__tests__/` pass — payout formula and WhatsApp formatter.

## Admin URL

After deploy, the admin URL is:

```
https://[your-vercel-url]/admin/[ADMIN_TOKEN]
```

Where `ADMIN_TOKEN` is the value you generated with `openssl rand -hex 32` and set via `supabase secrets set`.

Share this URL only with Choi (uploads) and Wolf (classifies events).
