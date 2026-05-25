# KickStock — FanFi: The On-Chain Capital Market for Football Fandom

**Own the players. Trade the Cup.** KickStock turns every World Cup footballer into a tradeable on-chain stock on **X Layer** — priced by a bonding curve, graduating into an AMM, paying performance dividends, bundled into ETFs, and rated by an on-chain research desk.

> Built for **OKX Build X Hackathon · XCup 2026** · Chain: **X Layer Testnet (chainId 195)** · Track: **DeFi / Trading (category: FanFi)**

---

## Why KickStock is different

Prediction markets let you **bet** on an outcome. Fan games let you **play**. KickStock is neither.

**KickStock is FanFi — a capital market.** You don't wager on a binary result; you **hold, trade, and earn from** the players you believe in:

- **Like a stock** — buy/sell continuously on a bonding curve, then on an AMM once a player "graduates."
- **Like a dividend share** — holders earn real cash-flow dividends driven by on-chain match performance.
- **Like an ETF** — bundle a national squad, a position, or the "World Cup 500" all-stars into one tokenized index.
- **Like an exchange** — provide liquidity, earn fees, and read an on-chain equity-research desk for fair-value signals.

---

## Architecture

```
kickstock/
├── contracts/                      # Foundry (Solidity 0.8.24, evm_version=paris)
│   ├── src/
│   │   ├── PlayerToken.sol             # Per-player ERC-20 with built-in dividend accumulator
│   │   ├── PlayerTokenFactory.sol      # EIP-1167 minimal proxy clone factory
│   │   ├── PlayerMarket.sol             # Primary market: bonding curve buy/sell + fee split
│   │   ├── PerformanceOracle.sol       # Oracle: push stats → distribute dividends
│   │   ├── MockUSDT.sol                # Testnet ERC-20 + faucet
│   │   └── libraries/
│   │       ├── BondingCurve.sol        # Pure function curve math
│   │       ├── DividendMath.sol        # Accumulator pure functions
│   │       └── KickTypes.sol           # Constants/errors/enums
│   ├── test/                           # Full test suite (unit + fuzz)
│   └── script/                         # Deployment & simulation scripts
├── apps/
│   ├── web/                            # Next.js 14 frontend
│   ├── indexer/                        # Event indexer + REST API
│   ├── ticker/                         # X ticker bot
│   └── research/                       # AI research desk
├── packages/
│   ├── config/players.config.js        # 200 star players across 48 teams
│   └── abi/                            # Shared ABI
├── .github/workflows/ci.yml           # CI pipeline
├── turbo.json · pnpm-workspace.yaml
└── README.md
```

## Economic Core (Provably Solvent)

Linear discrete bonding curve: `price(s) = BASE + SLOPE·s`
- **Buy cost**: `cost(S,n) = n·BASE + SLOPE·(n·S + n(n-1)/2)`
- **Sell proceeds**: `proceeds(S,n) = n·BASE + SLOPE·(n·(S-n) + n(n-1)/2)`
- **Reserve invariant**: `reserve(S) = S·BASE + SLOPE·(S(S-1)/2)` — any holder can always exit

Performance dividends use a per-token `accDivPerShare` accumulator over `eligibleSupply` (AMM-pooled tokens excluded). New buyers can't siphon past dividends (`rewardDebt`).

## Development Progress

### M0 — Scaffolding ✅
- [x] pnpm + turbo monorepo (contracts / apps/web / apps/indexer / apps/ticker / apps/research / packages)
- [x] Foundry configuration: solc=0.8.24, evm_version=paris
- [x] CI skeleton (.github/workflows/ci.yml)
- [x] Directory structure and workspace configuration

### M1 — Libraries + Currency ✅
- [x] `KickTypes.sol` — Constants, enums, custom errors
- [x] `BondingCurve.sol` — Pure function curve math (priceAt / cost / proceeds / reserveOf)
- [x] `DividendMath.sol` — Accumulator pure functions (accDelta / accumulated / pending)
- [x] `MockUSDT.sol` — Testnet ERC-20 + faucet + cooldown + owner mint
- [x] Full fuzz test suite — Curve identities, dividend conservation, anti-siphon, transfer semantics
- [x] **51 tests passing** (12 curve + 6 dividend + 7 MockUSDT + 26 PlayerToken)

### M2 — PlayerToken + Factory ✅
- [x] `PlayerToken.sol` — Per-player ERC-20 (18 decimals) with built-in dividend accumulator
  - accDivPerShare / eligibleSupply / rewardDebt / claimable
  - OZ v5 `_update` transfer hook (settle-before-balance-change → reset debt → sync eligible)
  - Exclusion mechanism (AMM pool / PlayerMarket / zero address excluded from eligibleSupply)
  - mintShares / burnShares (market only)
  - accrue / claim / pending / setExcluded
- [x] `PlayerTokenFactory.sol` — EIP-1167 minimal proxy clone deployment
- [x] `PlayerToken.t.sol` — Comprehensive test suite:
  - Proportional dividend distribution
  - Anti-siphon (late buyer pending=0)
  - Transfer carries future not past
  - Excluded addresses don't count in eligibleSupply
  - Claim, re-claim after new accrual
  - Fuzz: dividend conservation + anti-siphon

### M3 — PlayerMarket (Primary Market, No Graduation) ✅
- [x] `PlayerMarket.sol` — Primary market with linear bonding curve trading
  - `listPlayer` / `listPlayersBatch` — deploy PlayerToken clones via factory
  - `quoteBuy` / `quoteSell` / `currentPrice` — view functions for quoting
  - `buy(playerId, shares, maxTotal)` — buy on bonding curve with slippage protection
  - `sell(playerId, shares, minNet)` — sell on bonding curve with slippage protection
  - `_splitFee` — three-way fee split: referral → dividend pool → protocol
  - `setReferrer` — one-time referral link binding
  - `fundDividends` — external dividend budget injection
  - `distribute` — oracle-gated dividend distribution from budget
  - `withdrawProtocolFees` / `setOracle` / `setParams` — admin functions
  - Events: PlayerListed / Bought / Sold / ReferralPaid / DividendFunded / DividendDistributed / ParamUpdated
- [x] `PlayerMarket.t.sol` — 31 tests:
  - Reserve invariant: `reserve == reserveOf(supply)` after every buy/sell
  - Monetary conservation: `usdt.balanceOf(market) == Σreserve + ΣdividendBudget + protocolFees`
  - Full sell-off: any holder can sell all shares without revert
  - Three-way fee split: correct with/without referrer
  - Slippage protection: buy/sell revert when limits exceeded
  - Fuzz: reserve invariant + monetary conservation

### M4 — Oracle + Dividend Distribution ✅
- [x] `PerformanceOracle.sol` — Match performance oracle
  - `pushStat(playerId, statType)` — push single stat, trigger dividend distribution
  - `pushBatch(playerIds, statTypes)` — batch push for match rounds
  - `setStatReward` — configurable reward per stat type
  - Default rewards: GOAL=50 / ASSIST=25 / CLEAN_SHEET=20 / MOTM=30 mUSDT
  - Zero-reward stats (RED_CARD) skipped in batch, revert on single push
- [x] `PerformanceOracle.t.sol` — 19 tests:
  - Access control: only owner can push stats
  - Budget insufficient revert
  - Batch correctness: multi-player, multi-stat
  - End-to-end: GOAL → distribute → accrue → claim full chain
  - Fuzz: dividend conservation across varying holder counts
- [x] **101 tests passing** across all 6 test suites

### Upcoming
- [ ] M5 — Deploy to X Layer Testnet + OKLink verification
- [ ] M6 — Indexer + REST + Frontend MVP
- [ ] M7 — Graduation + AMM
- [ ] M8+ — Completion, indices, AI research, referral, etc.

## Player Roster

200 star players across all **48 projected qualified nations** for the 2026 FIFA World Cup. See `packages/config/players.config.js`.

- **Hosts**: USA, Mexico, Canada
- **UEFA (16)**: France, England, Spain, Germany, Netherlands, Portugal, Belgium, Croatia, Italy, Switzerland, Denmark, Poland, Austria, Turkey, Serbia, Ukraine
- **CONMEBOL (6)**: Argentina, Brazil, Uruguay, Colombia, Ecuador, Paraguay
- **AFC (8)**: Japan, South Korea, Australia, Iran, Saudi Arabia, Iraq, Qatar, Uzbekistan
- **CAF (9)**: Morocco, Senegal, Nigeria, Egypt, Cameroon, Ivory Coast, Algeria, Ghana, Tunisia
- **CONCACAF (3 non-host)**: Panama, Costa Rica, Jamaica
- **Play-off / Additional**: Norway, Sweden, Scotland

**Position distribution**: ~85 FW / 65 MF / 30 DF / 10 GK — star-heavy roster optimized for trading interest (200 players total, expanded from initial 150).

Includes helpers: `COUNTRIES`, `PLAYER_BY_ID`, `PLAYERS_BY_COUNTRY` for programmatic access.

## Getting Started

```bash
pnpm install

# Contracts
cd contracts
forge build
forge test -vvv
forge coverage
```

## Testing & Security

- Foundry unit + invariant fuzz tests (curve identities, dividend conservation, anti-siphon)
- Target: core contracts ≥90% coverage, no High-severity findings
- Known/accepted: sub-wei divide-before-multiply, single-signer oracle (hackathon design)

## Built on X Layer / OKX Ecosystem

| Integration | How |
|---|---|
| **X Layer Testnet (195)** | All contracts deployed; sub-cent gas for micro-trades |
| **OKX Wallet** | First-class RainbowKit connector |
| **OKLink** | All contracts source-verified |
| **OKX DEX API** | HMAC-signed OKB/USDT quotes |
| **zkEVM compatible** | `evm_version=paris` (no PUSH0) |

## License

MIT

---

*Built for the Build X Hackathon by OKX / X Layer. Own the players. Trade the Cup.*
