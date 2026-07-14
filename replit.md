# Bomb Survival Discord Bot

A Discord economy game bot. Players bet money, pick tiles hiding bombs, and the last survivor wins the prize pool.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the bot + API server
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `DISCORD_TOKEN` — your Discord bot token
- Required env: `BOT_OWNER_ID` — your Discord user ID (for !grant and !deduct)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Discord.js v14
- Economy data: JSON file at `data/economy.json`
- API: Express 5 (bot runs alongside the HTTP server)

## Commands

| Command | Who | Description |
|---|---|---|
| `!bomb` | Anyone | Start a Bomb Survival lobby |
| `!balance` / `!bal` | Anyone | Check your wallet |
| `!daily` | Anyone | Random reward (24h cooldown) |
| `!work` | Anyone | Earn $500 (2h cooldown) |
| `!givecash @user amount` | Anyone | Send money from your wallet |
| `!grant @user amount` | Bot Owner only | Add unlimited money |
| `!deduct @user amount` | Bot Owner only | Remove money from any player |

## Game Flow

1. `!bomb` → lobby embed with Join/Leave/Start/Cancel buttons
2. Players click Join → choose bet ($500–$5000)
3. Host clicks Start → tiles appear as ❓ buttons
4. Players take turns (10s each) clicking tiles
5. 💣 Bomb = eliminated, ✅ Safe = turn passes
6. Final 2 players → Bomb/Safe showdown
7. Winner gets the full prize pool

## Tile/Bomb Scaling

| Players | Tiles | Bombs |
|---|---|---|
| 2–4 | 10 | 2–3 (random) |
| 5–6 | 12 | 4 |
| 7–8 | 14 | 6 |
| 9–11 | 16 | 8 |
| 12–13 | 18 | 10 |

## Economy Features

- **Starting balance:** $5,000 for new players
- **Daily:** Random $500–$10,000 (or lose $500), 24h cooldown
- **Work:** $500 every 2 hours
- **Tax:** $2,500 deducted every 3 days from wallets ≥ $25,000

## Where things live

- `artifacts/api-server/src/bot/` — all bot code
- `artifacts/api-server/src/bot/store.ts` — economy data store
- `artifacts/api-server/src/bot/embeds.ts` — Discord embed builders
- `artifacts/api-server/src/bot/interactions.ts` — button handler / game logic
- `artifacts/api-server/src/bot/handlers/` — per-command handlers
- `data/economy.json` — player wallet data (auto-created)

## User preferences

- Embeds should be modern/stylish with emoji
- Bet buttons are dark (Secondary style)
- No modals — all interactions via buttons
