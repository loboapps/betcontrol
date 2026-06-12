# BetControl — Design Document
**Date:** 2026-06-12  
**Status:** Approved

---

## 1. Overview

BetControl is a web application that replaces a shared Excel spreadsheet used by a friend group to track sports bets. It provides automatic bet slip parsing via Claude Vision, per-player P&L calculation, and analytics views by date and by event/category.

**Users:** Wolf, Choi, Felipe, Jo, Trigo, Hu, Bueno, Ninho  
**Primary bettor/uploader:** Choi (uploads slips)  
**Primary analyst:** Wolf (classifies events in detail)

---

## 2. Architecture

### Stack
- **Frontend:** React + TypeScript + Vite — hosted on Vercel
- **Backend:** Supabase PostgreSQL (project: APT)
  - All data returned via JSONB from RPC functions — no direct REST calls to tables
  - Row Level Security (RLS) enabled — public read, service-role writes
- **Slip Parsing:** Supabase Edge Function → Anthropic API (`claude-haiku-4-5`)
- **Auth:** No user login — public read, admin via secret URL `/admin/[SECRET_TOKEN]`

### Security Model
- Anon key: read-only RPC calls from the frontend
- Service role key: only used in Edge Functions and admin operations
- Admin token: long random string stored as environment variable, validated server-side in the Edge Function
- RLS on all `bc_` tables: `SELECT` open to anon, `INSERT/UPDATE/DELETE` require service role

### Environments
- Dev: Vite dev server local + Supabase APT project (production) — no local Supabase instance
- Production: Vercel (frontend) + Supabase APT project (backend)

---

## 3. Data Model

### Tables (all prefixed `bc_`)

#### `bc_players`
Registered bettors and their total accumulated deposits.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | Display name (Wolf, Choi, etc.) |
| `display_order` | int | Wolf=1, Choi=2 (appear first in all views) |
| `total_deposited` | numeric(10,2) | Total deposited to date |

#### `bc_bets`
One row per bet slip uploaded.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slip_ref` | text | FanDuel slip ID (parsed from image) |
| `bet_date` | date | Date of the bet (parsed from slip) |
| `description` | text | Bet description (parsed from slip) |
| `sport` | text | Required at upload: NFL, FIFA, NBA, etc. |
| `event_label` | text | Optional detail (e.g. "23-24 Wk 09") — set in batch tool |
| `total_buyin` | numeric(10,2) | Total group stake on this slip |
| `total_payout` | numeric(10,2) | Total payout if win |
| `won` | boolean | Whether the bet won |
| `gtd` | boolean | Voided — currently treated as money returned; see GTD note below |
| `vendor` | text | "fanduel" (only vendor for now) |
| `api_input_tokens` | int | Tokens used in parse request (for cost tracking) |
| `api_output_tokens` | int | Tokens used in parse response |

#### `bc_bet_players`
Per-player allocation for each bet.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `bet_id` | uuid FK → bc_bets | |
| `player_id` | uuid FK → bc_players | |
| `buyin` | numeric(10,2) | How much this player put in |
| `payout` | numeric(10,2) | Stored at write time — see Payout Formula below |

### Payout Formula

For each `bc_bet_players` row:

```
if gtd = true:
  payout = buyin  (money returned, net P&L = 0)
elif won = false:
  payout = 0      (lost)
else:
  payout = (buyin / total_buyin) × total_payout
```

Net P&L = `payout - buyin`

> **GTD — Expansão futura:** Atualmente GTD significa "dinheiro devolvido". Na realidade, o retorno é um *vale* com data de expiração emitido pela FanDuel. A estrutura atual não inviabiliza essa expansão — basta adicionar 3 colunas opcionais em `bc_bets`: `gtd_voucher_ref text`, `gtd_voucher_expires date`, `gtd_voucher_redeemed boolean`. Quando o vale é resgatado, o P&L passa de 0 para positivo. Enquanto não houver essa expansão, GTD = payout de volta ao jogador.

### RPC Functions (all return JSONB)

| Function | Returns | Used by |
|----------|---------|---------|
| `bc_get_bets(p_from date, p_to date)` | List of bets with player allocations | Bets screen |
| `bc_get_por_data(p_from date, p_to date)` | P&L grouped by date | Por data screen |
| `bc_get_por_evento(p_sport text)` | P&L grouped by sport + event_label | Por evento screen |
| `bc_get_player_summary()` | Per-player: deposited, net P&L, balance | Player sidebar |
| `bc_get_unclassified_bets()` | Bets with sport set but event_label null | Batch classification tool |

---

## 4. Screens & Navigation

### Navigation
- **Mobile:** Bottom tab bar (fixed) — 3 tabs: Bets / Por data / Por evento
- **Desktop:** Top navigation bar — same 3 sections
- **Admin:** Accessible only via `/admin/[SECRET_TOKEN]`

### 4.1 Bets Screen (`/`)
Main list of all bets.

- Date range filter (default: current week)
- Each row: date, description, sport badge, total buyin, total payout, won/lost/GTD indicator
- Expandable row: shows per-player allocation (buyin + payout per player)
- Copy-to-WhatsApp button: generates formatted text summary of visible bets

### 4.2 Por Data (`/por-data`)
P&L summary grouped by date, with a player sidebar.

- **Left sidebar (fixed):** List of all players, ordered by `display_order`
  - Each player card: name, net P&L for selected period, total deposited, current balance
  - Selecting a player filters the main panel to show only their bets
- **Main panel:** Rows grouped by date
  - Each date row: total group buyin, total payout, group net P&L
  - If player is selected: shows that player's buyin/payout/net for that date
- Date range selector at top
- Copy-to-WhatsApp button

### 4.3 Por Evento (`/por-evento`)
P&L summary grouped by sport and event label.

- Sport filter tabs: All / NFL / FIFA / NBA / Other
- Rows grouped by `sport` → `event_label`
- Each row: event name, number of bets, total buyin, total payout, net P&L
- Player sidebar (same as Por data)
- Copy-to-WhatsApp button

### 4.4 Admin (`/admin/[SECRET_TOKEN]`)
Two sections:

**A. Upload Slip**
1. Image upload area (drag & drop or tap to select)
2. "Parse Slip" button → calls Edge Function → pre-fills form
3. Editable form fields: date, description, sport (required dropdown), total buyin, total payout, won (toggle), GTD (toggle)
4. Per-player allocation: list of all players, each with a buyin input field (must sum to total buyin)
5. Confirm & Save button

**B. Batch Classify Events**
- Shows list of bets where `event_label` is null, grouped by sport
- Each row: date, description, sport (already set) — inline text input for `event_label`
- "Save all" button at bottom
- Designed for Wolf to bulk-classify after Choi uploads

**C. Manage Deposits**
- List of all players with their `total_deposited` value
- Inline edit per player
- Save button

---

## 5. Slip Parsing (Edge Function)

### Endpoint
`POST /functions/v1/bc-parse-slip`

### Request
```json
{
  "admin_token": "SECRET_TOKEN",
  "image_base64": "...",
  "vendor": "fanduel"
}
```

### Flow
1. Validate `admin_token` (compare to env var `ADMIN_TOKEN`)
2. Call Anthropic API: `claude-haiku-4-5` with the image + FanDuel-specific prompt
3. Parse structured JSON from response
4. Return extracted data + `input_tokens` + `output_tokens` to frontend
5. Frontend pre-fills the confirmation form — user reviews before saving

### Extracted Fields
```typescript
interface ParsedSlip {
  slip_ref: string;
  bet_date: string;       // ISO date
  description: string;
  total_buyin: number;
  total_payout: number;
  vendor: string;
}
```

### Cost Tracking
- After each parse, `api_input_tokens` and `api_output_tokens` are returned and stored on the `bc_bets` row
- Estimated cost per slip: ~$0.003 using Haiku 4.5
- Console budget alert configured at $5/month on Anthropic Console

### Fallback
If parsing fails or confidence is low, the form opens blank — admin fills manually.

---

## 6. WhatsApp Copy Format

Generated by each screen's "Copiar para WhatsApp" button.

**Por data example:**
```
📊 BetControl — 01/06 a 08/06

💰 Grupo
Investido: R$ 450,00
Retorno:   R$ 610,00
Lucro:     +R$ 160,00

👤 Wolf
Investido: R$ 150,00
Retorno:   R$ 203,33
Lucro:     +R$ 53,33

👤 Choi
Investido: R$ 150,00
Retorno:   R$ 203,33
Lucro:     +R$ 53,33
...
```

---

## 7. Design System

### Color Palette: Charcoal + Amber
- **Background:** `zinc-900` (#18181b)
- **Surface/Cards:** `zinc-800` (#27272a)
- **Borders:** `zinc-700` (#3f3f46)
- **Text primary:** `zinc-50` (#fafafa)
- **Text secondary:** `zinc-400` (#a1a1aa)
- **Accent/CTA:** `amber-500` (#f59e0b)
- **Hover accent:** `amber-400` (#fbbf24)
- **Win indicator:** `emerald-500`
- **Loss indicator:** `rose-500`
- **GTD indicator:** `zinc-400` (neutral)

### Icons
Lucide React — no emojis in UI elements (emojis only in WhatsApp copy output)

### Typography

**Font:** [Inter](https://fonts.google.com/specimen/Inter) — clean, moderna, excelente legibilidade em UIs densas em dados (usada por Vercel, Linear, Stripe). Carregada via `@fontsource/inter`.

Alternativa se quiser algo com mais personalidade: **Plus Jakarta Sans** — geométrica, levemente esportiva, funciona bem com o tema charcoal + amber.

- Headings: `font-bold tracking-tight text-zinc-50` (Inter Bold)
- Subheadings / card titles: `font-semibold text-zinc-100`
- Body: `font-normal text-zinc-300`
- Labels/captions: `text-zinc-400 text-sm`
- Números em tabelas: `font-mono tabular-nums` — alinha colunas de valores corretamente

### Component Conventions
- Cards: `bg-zinc-800 rounded-lg border border-zinc-700`
- Primary buttons: `bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold`
- Secondary buttons: `bg-zinc-700 hover:bg-zinc-600 text-zinc-100`
- Badges (sport): small pill, color per sport (amber=NFL, blue=FIFA, green=NBA)
- Mobile-first, responsive via Tailwind breakpoints (`sm:`, `md:`, `lg:`)

---

## 8. TypeScript Standards

- Strict mode enabled in `tsconfig.json`
- `any` is **never** used — use proper types, generics, or `unknown` + narrowing
- All shared types in `src/types/`
- Key types: `Bet`, `BetPlayer`, `Player`, `ParsedSlip`, `PorDataRow`, `PorEventoRow`
- All Supabase RPC calls typed with their return shape

---

## 9. File Structure (planned)

```
src/
  components/
    layout/        # Nav, BottomNav, Layout
    bets/          # BetRow, BetList, BetFilters
    analytics/     # PlayerSidebar, PorDataTable, PorEventoTable
    admin/         # SlipUpload, ClassifyBets, ManageDeposits
    ui/            # Button, Badge, Card, Input (design system primitives)
  pages/
    Bets.tsx
    PorData.tsx
    PorEvento.tsx
    Admin.tsx
  hooks/
    useBets.ts
    usePorData.ts
    usePorEvento.ts
    usePlayerSummary.ts
  lib/
    supabase.ts    # Supabase client (anon key)
    clipboard.ts   # WhatsApp copy formatter
  types/
    index.ts       # All shared TypeScript types
.supabase/
  tables/
    bc_players.sql
    bc_bets.sql
    bc_bet_players.sql
  functions/
    bc_get_bets.sql
    bc_get_por_data.sql
    bc_get_por_evento.sql
    bc_get_player_summary.sql
    bc_get_unclassified_bets.sql
supabase/
  functions/
    bc-parse-slip/
      index.ts     # Edge Function
```

---

## 10. Out of Scope (v1)

- Multiple bookmakers (only FanDuel in v1 — vendor field reserved for future)
- User authentication / login
- Push notifications
- Historical deposit tracking (only current total per player)
- Mobile app (web-only, mobile-responsive)
- GTD como vale com data de expiração (estrutura preparada — ver nota no Payout Formula)

---

## 11. Considerações Futuras

### Autenticação de usuários (mesmo projeto Supabase APT)
O projeto APT já tem usuários registrados de outras aplicações. Para integrar sem conflito: adicionar coluna nullable `user_id uuid references auth.users(id)` em `bc_players`. Usuários sem essa ligação (de outros apps ou sem conta) continuam com acesso read-only anon. RLS policies checam `auth.uid() IN (SELECT user_id FROM bc_players)` para permitir writes do próprio jogador. Essa migração é 100% aditiva — não quebra nada que foi construído em v1.
