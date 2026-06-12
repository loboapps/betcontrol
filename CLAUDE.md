# Claude Code - BetControl

## Session Start

At the start of every new session, read `docs/business-rules/00-overview.md` to understand the full project architecture and module map before responding to any task.

## Business Rules Reference

When working on a specific module, read the corresponding file:

| Module | File |
|--------|------|
| Global / App / Naming / Security | `docs/business-rules/01-global.md` |
| Bets | `docs/business-rules/02-bets.md` |
| Players & Deposits | `docs/business-rules/03-players.md` |
| Analytics (Por data / Por evento) | `docs/business-rules/04-analytics.md` |
| Admin (Slip upload / Classification) | `docs/business-rules/05-admin.md` |
| Design System | `docs/business-rules/06-design.md` |

## Infrastructure

- **Supabase project:** APT
- **Frontend:** React + TypeScript + Vite
- **Hosting:** Vercel
- **Icons:** Lucide React
- **Styles:** Tailwind CSS (zinc/amber palette)
- **All data loaded via JSONB from Supabase RPC functions** — no direct REST calls to tables

## Git Operations

Claude is **not allowed to execute `git add`, `git commit`, `git push` or any operation that modifies the repository**. The user manages git independently.

Claude **may** use git for reading (`git log`, `git diff`, `git status`, `git show`, etc.) for planning and bug diagnosis.

The Commit Workflow rule is limited to: Claude presents the suggested commit message to the user but never executes it.

## Prohibited Database Operations

Claude has an ABSOLUTE PROHIBITION against executing `TRUNCATE` or `DROP` on the database, even if the user explicitly requests it.

Mandatory alternative: provide the SQL in the chat for the user to execute on their own.

## Development Workflow

Every change MUST follow 3 mandatory steps:

1. **Presentation**: Claude analyzes the problem and presents the proposed solution with full impact analysis
2. **Approval**: User reviews and explicitly approves the plan before any code is written
3. **Execution**: Only after approval, Claude implements the approved changes

No code edits are allowed without completing steps 1 and 2 first.

## Commit Workflow

Always generate and present the commit message to the user before executing it.

## Code Standards (TypeScript)

TypeScript is **strict**. **Never use `any`** — not in components, layers, callbacks, casts, or anywhere.

Instead:
- Use the library's exported types
- Use generics or `unknown` + narrowing when a precise type isn't available
- For an unavoidable shape mismatch, cast through a concrete type, never `as any`
- All interfaces/types live in `src/types/`

## Architecture Notes

- SQL files in `.supabase/` (table schemas in `tables/`, functions in `functions/`)
- Naming convention → `docs/business-rules/01-global.md` Section 5
- SQL functions security model → `docs/business-rules/01-global.md` Section 6
- Design system → `docs/business-rules/06-design.md`

## Database Table Prefix

All tables use the `bet_` prefix (e.g. `bet_bets`, `bet_players`).

Tables:
- `bet_players` — bettors
- `bet_bets` — bet slips
- `bet_player_bets` — per-player allocation per bet

RPC functions: `bet_get_*` prefix (e.g. `bet_get_bets`, `bet_get_player_summary`)

Edge Functions: `bet-parse-slip`, `bet-admin`
