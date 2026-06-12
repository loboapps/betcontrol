# Claude Code - Project Context

## Session Start

At the start of every new session, read `docs/business-rules/00-overview.md` to understand the full project architecture and module map before responding to any task.

## Business Rules Reference

When working on a specific module, read the corresponding file:

| Module | File |
|--------|------|
| Global / App / Naming / Security | `docs/business-rules/01-global.md` |
| DLV (Daily Liquid Values) | `docs/business-rules/02-dlv.md` |
| Assets | `docs/business-rules/03-assets.md` |
| Checking Accounts | `docs/business-rules/04-checking.md` |
| Wallet / Portfolio | `docs/business-rules/05-wallet.md` |
| Bills | `docs/business-rules/06-bills.md` |
| Credit Cards | `docs/business-rules/07-cc.md` |
| Dashboard | `docs/business-rules/08-dashboard.md` |
| Triggers | `docs/business-rules/09-triggers.md` |
| Design System | `docs/business-rules/10-design.md` |

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

TypeScript is **strict**. **Never use `any`** — not in components, layers, callbacks, casts, or anywhere. This is non-negotiable, even when matching surrounding code that already (incorrectly) uses `any`.

Instead:
- Use the library's exported types (e.g. `BarCustomLayerProps<D>` from `@nivo/bar`).
- Use generics or `unknown` + narrowing when a precise type isn't available.
- For an unavoidable shape mismatch, cast through a concrete type (e.g. `x as unknown as (v: number) => number`), never `as any`.
- All interfaces/types live in `src/types/` (see `docs/business-rules/10-design.md` §4).

## Architecture Notes

- React + TypeScript + Vite frontend
- Supabase (PostgreSQL) backend
- All data loaded via JSON from Supabase RPC functions
- Production environment only (no staging/testing)
- SQL files in `.supabase/` (table schemas in `tables/`, functions in `functions/`)
- Naming convention → `docs/business-rules/01-global.md` Section 5
- Cron scripts (GitHub Actions): `.github/app_scp_*.js` — workflows in `.github/workflows/`
- SQL functions security model → `docs/business-rules/01-global.md` Section 6
- Design system → `docs/business-rules/10-design.md`

## Critical Query Rule — wallet_tbl_dailytotals Historical Data (before 31/12/2024)

Before 01/01/2025, `wallet_tbl_dailytotals` has incomplete rows for non-last-day-of-month dates:
- `stock_balance` / `stock_deposits` exist on every day (stocks are always daily)
- `assets_balance` / `assets_deposits` / `checking_balance` / `checking_deposits` exist **only on the last day of each month**

This means intermediate days (e.g. the 15th, 22nd) show partial data: stocks with assets=0 and checking=0. **This data is meaningless as a portfolio snapshot.**

**Rules — ALWAYS apply when querying data where DATE < 31/12/2024:**
1. **Never return or use non-last-day-of-month rows.** Filter queries to the last day of each month only.
2. **Never read `stock_deposits` from the last-day row alone.** That row contains only that specific day's transactions. To get the monthly stock deposit total, `SUM(stock_deposits)` across all days of the month.
3. **`assets_deposits` and `checking_deposits` on the last-day row are safe** — they contain the full monthly total already.

From 01/01/2025 onwards, all columns are populated daily — no special handling needed.
