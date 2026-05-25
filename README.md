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
│   │   ├── PlayerMarket.sol            # Primary market: bonding curve + graduation → AMM
│   │   ├── PlayerAMM.sol               # M7: Constant-product AMM (x*y=k) for graduated players
│   │   ├── IndexVault.sol              # M10: Index/ETF — basket token per index, mint/redeem/NAV
│   │   ├── PerformanceOracle.sol       # Oracle: push stats → distribute dividends
│   │   ├── MockUSDT.sol                # Testnet ERC-20 + faucet
│   │   └── libraries/
│   │       ├── BondingCurve.sol        # Pure function curve math
│   │       ├── DividendMath.sol        # Accumulator pure functions
│   │       └── KickTypes.sol           # Constants/errors/enums + graduation threshold
│   ├── test/                           # Full test suite (unit + fuzz + fork)
│   │   ├── Graduation.t.sol           # M7: 12 graduation tests
│   │   ├── PlayerAMM.t.sol            # M7: 21 AMM tests
│   │   └── IndexVault.t.sol           # M10: 28 index mint/redeem/NAV/weight tests
│   └── script/                         # Deployment & simulation scripts
│       ├── Deploy.s.sol                # Full deployment + wiring
│       ├── ListPlayers.s.sol           # Batch list 200 players
│       ├── FundTraders.s.sol           # Fund burner wallets
│       ├── SimulateTrading.s.sol       # Weighted-random trading sim
│       ├── SimulateGraduation.s.sol    # M7: Graduation + AMM swap/LP simulation
│       ├── SimulateMatchday.s.sol      # M8: Matchday simulation (pushBatch → dividends)
│       └── SeedIndices.s.sol           # M10: Deploy IndexVault + define indices + demo mint/redeem
├── deployments/
│   └── xlayer-testnet.json             # Deployed addresses + tx hashes
├── apps/
│   ├── web/                            # Next.js 14 frontend (wagmi + RainbowKit)
│   │   ├── app/                        # App Router pages
│   │   │   ├── page.js                 # Home: hero + stats + top movers
│   │   │   ├── market/page.js          # 200-player market grid
│   │   │   ├── player/[id]/page.js     # Price chart + TradePanel + graduation + AMM swap + Share
│   │   │   ├── player/[id]/layout.js   # M8: Dynamic OG metadata for player pages
│   │   │   ├── pool/[id]/page.js       # M7: AMM pool page
│   │   │   ├── ipo/page.js             # M7: IPO graduation progress page
│   │   │   ├── faucet/page.js          # mUSDT faucet
│   │   │   ├── portfolio/page.js       # Holdings + dividend claims + Share
│   │   │   ├── portfolio/layout.js     # M8: Portfolio OG metadata
│   │   │   ├── leaderboard/page.js     # M8: 5-tab leaderboard
│   │   │   ├── judge/page.js           # M8: Judge Mode — on-chain proof dashboard
│   │   │   ├── indices/page.js         # M10: Index family listing (NAV, filter, components)
│   │   │   ├── index/[id]/page.js      # M10: Index detail (weight table, NAV, mint/redeem)
│   │   │   ├── api/og/route.js         # M8: Dynamic OG image generation (1200×630)
│   │   │   └── api/okx-price/route.js  # OKX DEX HMAC proxy
│   │   ├── components/                 # Navbar, TradePanel, SwapPanel, LPPanel, PriceChart,
│   │   │                               #   ShareOnX, OkLinkLink
│   │   └── lib/                        # chains, contracts, utils
│   ├── indexer/                        # Event indexer + REST API (leaderboard, judge, AMM events)
│   │   └── src/
│   │       ├── index.js                # Entry: indexer + API server
│   │       ├── config.js               # Env + contract addresses
│   │       ├── db.js                   # PostgreSQL schema + queries
│   │       ├── indexer.js              # viem 5-block polling (+ Graduated/Swapped events)
│   │       └── api.js                  # Express REST (:4000, 12+ endpoints)
│   ├── ticker/                         # M8: X ticker bot (DRY_RUN, OAuth1.0a, 5-block reorg)
│   │   └── src/
│   │       ├── index.js                # Entry point + graceful shutdown
│   │       ├── config.js               # Env + rate limits + contract addresses
│   │       ├── twitter.js              # Zero-SDK OAuth1.0a HMAC-SHA1 posting
│   │       ├── templates.js            # 8 tweet templates × 3 variants
│   │       └── monitor.js              # Event polling + periodic tasks
│   └── research/                       # AI research desk
├── packages/
│   ├── config/players.config.js        # 200 star players across 48 teams
│   ├── config/indices.config.js        # M10: Index families (48 national, 4 position, 5 continental, 1 all-star)
│   └── abi/                            # Shared ABI (includes PlayerAMM, IndexVault)
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

### M5 — Deploy + List + Simulate Trading (On-Chain Milestone) ✅
- [x] `Deploy.s.sol` — Full contract suite deployment + wiring
  - MockUSDT → PlayerTokenFactory → PlayerMarket → PerformanceOracle
  - market.setOracle(oracle) wiring
  - Writes `deployments/xlayer-testnet.json` with all addresses
- [x] `ListPlayers.s.sol` — Batch list all 200 star players
  - 4 batches of 50 players for gas safety
  - All players from `players.config.js` with `KickStock {Name}` / `K{CODE}` naming
- [x] `FundTraders.s.sol` — Generate 20 deterministic burner wallets
  - Mint 10,000 mUSDT per burner + 0.01 OKB gas each
  - Deterministic keys: `keccak256("kickstock-burner", i)`
- [x] `SimulateTrading.s.sol` — Weighted-random trading simulation
  - 20 burners × 15 rounds = 250+ Bought/Sold events
  - Weighted player selection: superstars (3×), stars (2×), regular (1×)
  - ~40% sell probability per round
- [x] `KickStockFork.t.sol` — Fork test against live testnet
  - Bytecode verification (all contracts have code)
  - Wiring verification (oracle↔market, market↔factory↔usdt)
  - Full flow: faucet → approve → buy → sell → claim
  - Reserve invariant on live state
  - Monetary conservation on live state
  - Oracle distribute end-to-end
- [x] X Layer Testnet deployment (chainId 195) — all contracts live
- [x] OKLink source code verification — all 5 contracts verified
- [x] **101 unit tests + 8 fork tests passing**

#### Deployed Contracts (X Layer Testnet)

| Contract | Address |
|---|---|
| MockUSDT | `0x4F51c373145bdd8F3EFbD90f4c3409CC2f1Ea851` |
| PlayerTokenFactory | `0x8d2b077ca39CaAdBE6a659128943106e784D8BD7` |
| PlayerToken (impl) | `0xA177d2c0669eD77FF2FED4e820412fB6b9643364` |
| PlayerMarket | `0xd98B4e5296c66aE56c55C5A4c1e9EB0DD512196f` |
| PerformanceOracle | `0xF1277da9b1F4b7b72A3A16EC8C17a00Ce702C056` |

### M6 — Indexer + REST + Frontend MVP ✅
- [x] **Indexer** (`apps/indexer`) — viem-based event indexer with 5-block confirmation polling
  - Subscribes to all contract events: PlayerListed, Bought, Sold, ReferralPaid, DividendFunded, DividendDistributed, ReferrerSet, StatPushed, DividendClaimed, Transfer
  - PostgreSQL schema: 13 tables (indexer_state, players, trades, price_points, dividends, dividend_claims, holdings, lp_positions, referrals, referral_earnings, indices, research_snapshots, stats)
  - Token registry: dynamically discovers PlayerToken clones from PlayerListed events
  - Checkpoint persistence: resumes from last processed block on restart
  - Batch processing: up to 2,000 blocks per poll cycle
- [x] **REST API** (`:4000`) — Express.js with CORS, 10 aggregation endpoints:
  - `GET /healthz` — health check with DB connectivity
  - `GET /api/market` — all players with supply, reserve, price, volume, trade count
  - `GET /api/player/:id` — single player detail
  - `GET /api/player/:id/trades` — paginated trade history
  - `GET /api/player/:id/price` — price point history (for charts)
  - `GET /api/player/:id/dividends` — dividend distribution history
  - `GET /api/portfolio/:address` — wallet holdings with player metadata
  - `GET /api/leaderboard` — top 50 by market cap or volume
  - `GET /api/stats` — global stats (volume, trades, dividends, unique traders)
  - `GET /api/judge` — AI judge placeholder
- [x] **Frontend** (`apps/web`) — Next.js 14 + wagmi v2 + viem v2 + RainbowKit
  - OKX Wallet first-class citizen (Recommended, first position)
  - Chain: X Layer Testnet (chainId 195)
  - WalletConnect projectId integrated
  - Dark trading-platform theme (Tailwind CSS)
  - Pages:
    - `/` — Hero + global stats + top movers
    - `/market` — 200-player grid with search/filter/sort, fallback to on-chain reads
    - `/player/[id]` — Price chart (SVG) + TradePanel (buy/sell with approve flow + 5% slippage) + trade history + dividends
    - `/faucet` — Claim 1,000 mUSDT with balance display
    - `/portfolio` — Holdings table + per-token dividend claim + total value
  - OKX DEX Aggregator API: HMAC-SHA256 signed OKB/USDT quotes via `/api/okx-price` proxy route
  - GasCostBadge component showing ≈$0.001 gas cost
  - Graceful fallback: works without indexer via direct contract reads

### M7 — Graduation + AMM (Secondary Market) ✅
- [x] **`PlayerAMM.sol`** — Constant-product AMM (x*y=k) for USDT/PlayerToken pairs
  - `initialize(usdt, token, market, usdtAmount, tokenAmount)` — Seed with graduation liquidity
  - `swapUsdtForShares(usdtIn, minOut)` / `swapSharesForUsdt(tokenIn, minOut)` — Swap with 1% fee
  - `addLiquidity(usdtAmount, minLp)` — Proportional LP mint
  - `removeLiquidity(lpAmount, minUsdt, minToken)` — LP burn with proportional withdraw
  - Fee distribution: 60% LP (stays in pool) / 30% dividend (PlayerToken.accrue) / 10% protocol
  - Minimum liquidity lock: 1,000 units sent to dead address on initialization
  - LP tokens are ERC-20 (`KSLP`) — transferable, composable
  - `price()` / `getK()` view helpers
- [x] **`PlayerMarket.graduate(playerId)`** — Graduation trigger
  - Anyone can call when `reserve >= GRADUATION_THRESHOLD` (50,000 mUSDT)
  - Drains bonding curve reserve + mints tokens at current curve price
  - Deploys new PlayerAMM, seeds with USDT + PlayerToken
  - `setExcluded(amm, true)` — Pool tokens excluded from dividends
  - `setAmm(amm)` — Authorizes AMM to call `PlayerToken.accrue` for dividend fee routing
  - Closes bonding curve `buy()`/`sell()` for graduated players (`AlreadyGraduated` revert)
  - `canGraduate(playerId)` / `graduationProgress(playerId)` view helpers
- [x] **`PlayerToken.sol`** — Updated with AMM authorization
  - `amm` field + `setAmm(address)` (market-only)
  - `onlyMarketOrAmm` modifier on `accrue()` — allows both market and AMM to distribute dividends
- [x] **`KickTypes.sol`** — New constants
  - `GRADUATION_THRESHOLD = 50,000e18` mUSDT
  - `AMM_FEE_BPS = 100` (1% swap fee)
  - `AMM_LP_BPS = 6,000` / `AMM_DIV_BPS = 3,000` / `AMM_PROTO_BPS = 1,000`
  - `MINIMUM_LIQUIDITY = 1,000`
  - New errors: `BelowGraduationThreshold`, `InsufficientLiquidity`, `AlreadyInitialized`, `NotInitialized`, `InvariantViolation`
- [x] **`SimulateGraduation.s.sol`** — Graduation simulation script
  - Concentrated buys push 5 superstars (Messi, Lautaro, Neymar, Vinicius, Mbappe) past threshold
  - Triggers graduation → AMM creation
  - Post-graduation: USDT→Token swap, Token→USDT swap, addLiquidity demonstration
- [x] **`Graduation.t.sol`** — 12 tests:
  - Below-threshold revert
  - At-threshold graduation success
  - Anyone can trigger (permissionless)
  - Cannot graduate twice
  - Seed ratio matches current curve price
  - AMM excluded from dividends
  - Bonding curve buy/sell closed after graduation
  - Reserve drained to zero
  - Graduation progress tracking
  - Post-graduation AMM swap functional
  - Fuzz: token supply consistency across graduation
- [x] **`PlayerAMM.t.sol`** — 21 tests:
  - Initialization + minimum liquidity locked
  - USDT→Token and Token→USDT swap mechanics
  - Constant product: x*y >= k after every swap (fee increases k)
  - Slippage protection on all operations
  - LP add/remove proportionality
  - Fee distribution: LP stays in pool, dividend accrues, protocol accumulates
  - Roundtrip swap always loses to fees
  - Protocol fee withdrawal access control
  - Fuzz: constant product invariant (1000 runs each direction)
- [x] **Frontend** — AMM trading UI
  - `SwapPanel.js` — Buy/sell tokens via AMM with estimated output, fee display, approval flow
  - `LPPanel.js` — Add/remove liquidity with proportional token calculation
  - `/pool/[id]` — AMM pool page: reserves, price, k-value, LP supply, contract address + swap/LP panels
  - `/ipo` — IPO graduation progress: progress bars (reserve/threshold), how-it-works guide, early-bird cost, filter tabs
  - `/player/[id]` — Updated: graduation progress bar, "Trigger Graduation" button, SwapPanel for graduated players, pool link
  - Navbar: Added "IPO" link
- [x] **134 tests passing** (101 existing + 12 Graduation + 21 PlayerAMM)

### M8 — Completion Enhancement (Leaderboard / OG / Ticker / Judge) ✅
- [x] **`/leaderboard`** — 5-tab leaderboard page:
  - Gainers (24h price change %)
  - Market Cap (supply × price)
  - Whales (top holders by total value across all players)
  - Dividends (most dividends distributed per player)
  - Referrals (top referrers by earnings)
  - Gold/silver/bronze rank styling, OKLink links per entry
- [x] **Price curve charts** — Enhanced SVG PriceChart component:
  - Y-axis price labels (5 ticks with dollar values)
  - X-axis time labels (date/time from timestamps)
  - Dashed grid lines
  - Interactive crosshair on hover with tooltip (exact price + time)
  - Improved 3-stop gradient fill
  - Graceful "No price data" empty state
- [x] **Dynamic OG cards** — `next/og` ImageResponse (1200×630):
  - `/api/og?type=player&id=X` — Player name, country flag, price, 24h change, dividend pool
  - `/api/og?type=portfolio&id=X` — Total holdings value, top 3 holdings, dividends claimed
  - `/api/og?type=index&id=X` — Index name, NAV, component preview
  - All cards include @KickStock branding + optional referral code
  - Server-side metadata generation for player and portfolio pages
- [x] **Share on X** — `ShareOnX` component on player and portfolio pages:
  - Twitter intent URL with pre-filled text, URL, and `via=KickStock_XL`
  - Opens in popup window
  - X logo icon
- [x] **`OkLinkLink` component** — Reusable OKLink explorer link:
  - Transaction links (`/tx/{hash}`) and address links (`/address/{addr}`)
  - Shortened display with external link icon
  - Green styling consistent with verification theme
- [x] **Ticker Bot** (`apps/ticker`) — Exchange ticker-voice X bot:
  - **DRY_RUN=true** by default (safe mode, logs only)
  - **X API v2 OAuth1.0a zero SDK** — manual HMAC-SHA1 signature, native `https` POST
  - **5-block anti-reorg** confirmation delay before processing events
  - **Rate limiting**: max 10 tweets per 15-minute window (sliding window)
  - Templates (3 variants each, randomly selected):
    - `PlayerListed` — "📈 NEW IPO: {player} {flag} listed at {price} mUSDT"
    - `Graduated` — "🎓 GRADUATED: {player} hit liquidity threshold, now on AMM"
    - Whale `Bought/Swap` (≥50 shares) — "🐋 WHALE: {shares} shares scooped"
    - `DividendDistributed` — "💸 DIVIDEND! {player} scored — {amount} mUSDT paid out"
    - Top 3 gainers (periodic, every 6h) — "🔥 TOP3: 🥇{A}+{x}% 🥈{B} 🥉{C}"
    - Countdown (daily) — "⏳ {N} days to kickoff. Market cap leaders: ..."
  - Each tweet includes OKLink proof link + `@XLayerOfficial #KickStock #XLayer`
  - Event monitor: viem polling with state persistence (JSON file)
- [x] **`SimulateMatchday.s.sol`** — Matchday simulation script:
  - Simulates "Group Stage Day 1" with 3 matches, 18 stat entries, 13 unique players
  - Argentina 2-1 France / Brazil 3-0 Germany / Spain 1-0 Italy
  - Step 1: Funds dividend budgets (approve + fundDividends, 500 mUSDT each)
  - Step 2: `oracle.pushBatch()` for all GOALs, ASSISTs, CLEAN_SHEETs, MOTMs
  - Step 3: Verifies post-distribution budgets
  - Full console2 logging for verification
- [x] **`/judge` Judge Mode** — One-screen self-proof page:
  - **Global on-chain metrics**: Total Volume, Trades, Graduated, Dividends Paid, Unique Addresses, Total Players
  - **Contract registry**: All 5 deployed contracts with addresses (copy button), OKLink verification badges (✓ Verified / ⏳ Pending), explorer links
  - **Live event stream**: Last 50 events from trades + dividends, color-coded type badges (Bought=green, Sold=red, Graduated=amber, Dividend=blue), each row links to OKLink tx
  - **Copy Verification Script**: One-click copy of a bash script using `cast code` to verify all contracts on-chain
  - Falls back to hardcoded contract addresses when indexer is unavailable
- [x] **Indexer enhancements**:
  - `GET /api/leaderboard?type=gainers|mcap|whales|dividends|referrals` with proper SQL queries
  - `GET /api/judge` — Full judge mode aggregation (metrics + contracts + events + verify script)
  - Graduated event handling — sets graduated flag, registers AMM address
  - Swapped event handling — records AMM trades, updates prices and stats
- [x] **Navbar** — Added "Leaderboard" and "Judge" links
- [x] **`next build` passing** — All 12 routes compile successfully

### M10 — Index / ETF (IndexVault) ✅
- [x] **`IndexVault.sol`** — M10 core contract: tokenized index baskets
  - `IndexToken` — ERC-20 basket token per index (minted/burned by vault)
  - `defineIndex(name, kind, components[], weightBps[])` — onlyOwner, validates Σweight==1e4
  - `mint(indexId, units, maxTotal)` — buy components proportionally by weight
    - Routes through bonding curve (un-graduated) or AMM swap (graduated) automatically
    - Binary search share estimation for bonding curve path
    - Aggregate slippage protection via `maxTotal`
  - `redeem(indexId, units, minNet)` — sell components proportionally for USDT
    - Pro-rata vault holdings based on basket share being redeemed
    - Routes through same bonding curve / AMM routing as mint
  - `nav(indexId)` — NAV per unit: component sell values weighted by vault holdings / total supply
  - `componentValues(indexId)` — per-component breakdown (playerIds, values, balances)
  - `deactivateIndex(indexId)` — disable minting, redeems still work
  - 5 index kinds: NATIONAL, POSITION, CONTINENTAL, ALLSTAR, CUSTOM
- [x] **`indices.config.js`** — Full index family definitions:
  - 48 National Squad indices (one per qualified World Cup nation, equal-weighted within squad)
  - 4 Position indices (FW / MF / DF / GK, top 20 players each)
  - 5 Continental indices (AFC / CAF / CONCACAF / CONMEBOL / UEFA)
  - 1 World Cup 500 All-Stars (top 20 global superstars, equal-weighted)
  - `equalWeights(count)` helper for BPS distribution
- [x] **`SeedIndices.s.sol`** — Deployment & demo script:
  - Deploys IndexVault contract
  - Defines 3 sample indices (Argentina National, FW Position, World Cup All-Stars)
  - Demo: mints 1000 units of Argentina index, shows NAV, redeems 500 units
  - Full console2 logging for verification
- [x] **`IndexVault.t.sol`** — 28 tests:
  - defineIndex: weight sum validation (=10000), overflow, underflow, zero weight, empty, mismatch
  - defineIndex: unlisted player reverts, only owner, multiple indices, 4 components
  - mint: single-component, multi-component weighted, zero units revert, inactive revert
  - mint (graduated): AMM path for graduated players
  - redeem: basic, partial, insufficient basket revert, zero revert
  - redeem (graduated): AMM sell path
  - NAV: zero supply returns 0, positive after mint, consistency check
  - NAV (graduated): correct for AMM-priced components
  - componentValues: per-component value breakdown after mint
  - deactivateIndex: status change, only owner
  - Index kinds: all 5 enum values
- [x] **Frontend** — Index trading UI:
  - `/indices` — Index family listing: filter tabs (All/National/Position/Continental/All-Star/Custom),
    NAV per card, component count, fallback UI when vault not deployed
  - `/index/[id]` — Index detail: component weight table with progress bars, NAV/unit,
    total supply, user balance, mint panel (approve + buy) and redeem panel (sell)
  - Navbar: Added "Indices" link
- [x] **ABI package** — Added `IndexVault_ABI` + `IndexToken_ABI`
- [x] **162 tests passing** (134 existing + 28 new IndexVault)
- [x] **`next build` passing** — All 14 routes compile successfully

### Upcoming
- [ ] M11+ — AI research desk, referral growth loop, etc.

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

# Deploy & Simulate (fill .env first)
forge script script/Deploy.s.sol:Deploy --rpc-url $XLAYER_TESTNET_RPC --private-key $OPERATOR_PRIVATE_KEY --broadcast
forge script script/ListPlayers.s.sol --rpc-url $XLAYER_TESTNET_RPC --private-key $OPERATOR_PRIVATE_KEY --broadcast
forge script script/SimulateTrading.s.sol --rpc-url $XLAYER_TESTNET_RPC --private-key $OPERATOR_PRIVATE_KEY --broadcast
forge script script/SimulateMatchday.s.sol:SimulateMatchday --rpc-url $XLAYER_TESTNET_RPC --private-key $OPERATOR_PRIVATE_KEY --broadcast

# Indexer (requires PostgreSQL)
cp .env.example .env   # fill in DATABASE_URL
cd apps/indexer
node src/index.js       # starts indexer + REST API on :4000

# Ticker Bot (DRY_RUN=true by default)
cd apps/ticker
DRY_RUN=true node src/index.js

# Frontend
cd apps/web
cp .env.local.example .env.local  # fill in keys
pnpm dev                # starts Next.js on :3000
```

Seed demos: `SimulateGraduation` (→ AMM), `SimulateMatchday` (→ dividends → claim), `SeedIndices` (→ ETFs), `SeedReferrals` (→ growth loop).

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
