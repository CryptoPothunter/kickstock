// @kickstock/ticker — Tweet templates
// Each event type has 3 variant templates; one is chosen at random.

const { config } = require("./config");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COUNTRY_FLAG = {
  ARG: "\uD83C\uDDE6\uD83C\uDDF7", AUS: "\uD83C\uDDE6\uD83C\uDDFA",
  AUT: "\uD83C\uDDE6\uD83C\uDDF9", ALG: "\uD83C\uDDE9\uD83C\uDDFF",
  BEL: "\uD83C\uDDE7\uD83C\uDDEA", BRA: "\uD83C\uDDE7\uD83C\uDDF7",
  CAN: "\uD83C\uDDE8\uD83C\uDDE6", CMR: "\uD83C\uDDE8\uD83C\uDDF2",
  CIV: "\uD83C\uDDE8\uD83C\uDDEE", COL: "\uD83C\uDDE8\uD83C\uDDF4",
  CRC: "\uD83C\uDDE8\uD83C\uDDF7", CRO: "\uD83C\uDDED\uD83C\uDDF7",
  DEN: "\uD83C\uDDE9\uD83C\uDDF0", ECU: "\uD83C\uDDEA\uD83C\uDDE8",
  EGY: "\uD83C\uDDEA\uD83C\uDDEC", ENG: "\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F",
  ESP: "\uD83C\uDDEA\uD83C\uDDF8", FRA: "\uD83C\uDDEB\uD83C\uDDF7",
  GER: "\uD83C\uDDE9\uD83C\uDDEA", GHA: "\uD83C\uDDEC\uD83C\uDDED",
  IRN: "\uD83C\uDDEE\uD83C\uDDF7", IRQ: "\uD83C\uDDEE\uD83C\uDDF6",
  ITA: "\uD83C\uDDEE\uD83C\uDDF9", JAM: "\uD83C\uDDEF\uD83C\uDDF2",
  JPN: "\uD83C\uDDEF\uD83C\uDDF5", KOR: "\uD83C\uDDF0\uD83C\uDDF7",
  KSA: "\uD83C\uDDF8\uD83C\uDDE6", MAR: "\uD83C\uDDF2\uD83C\uDDE6",
  MEX: "\uD83C\uDDF2\uD83C\uDDFD", NED: "\uD83C\uDDF3\uD83C\uDDF1",
  NGA: "\uD83C\uDDF3\uD83C\uDDEC", PAN: "\uD83C\uDDF5\uD83C\uDDE6",
  PAR: "\uD83C\uDDF5\uD83C\uDDFE", POL: "\uD83C\uDDF5\uD83C\uDDF1",
  POR: "\uD83C\uDDF5\uD83C\uDDF9", QAT: "\uD83C\uDDF6\uD83C\uDDE6",
  SEN: "\uD83C\uDDF8\uD83C\uDDF3", SRB: "\uD83C\uDDF7\uD83C\uDDF8",
  SUI: "\uD83C\uDDE8\uD83C\uDDED", TUN: "\uD83C\uDDF9\uD83C\uDDF3",
  TUR: "\uD83C\uDDF9\uD83C\uDDF7", UKR: "\uD83C\uDDFA\uD83C\uDDE6",
  URU: "\uD83C\uDDFA\uD83C\uDDFE", USA: "\uD83C\uDDFA\uD83C\uDDF8",
  UZB: "\uD83C\uDDFA\uD83C\uDDFF",
};

function flag(countryCode) {
  return COUNTRY_FLAG[countryCode] || "";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function suffix() {
  return "\n\n@XLayerOfficial #KickStock #XLayer";
}

function proofLink(txHash) {
  if (!txHash) return "";
  return `${config.explorerTxUrl}${txHash}`;
}

function fmt(mUSDT) {
  // Format raw wei-like value to human mUSDT (6 decimals)
  if (typeof mUSDT === "bigint") {
    const whole = mUSDT / 1000000n;
    const frac = mUSDT % 1000000n;
    if (frac === 0n) return whole.toString();
    return `${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
  }
  return String(mUSDT);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * @param {{ player: string, symbol: string, countryCode: string, price: bigint|string, txHash: string }} d
 */
function playerListed(d) {
  const f = flag(d.countryCode);
  const p = fmt(d.price);
  const link = proofLink(d.txHash);
  return pick([
    `\u{1F4C8} NEW IPO: ${d.player} ${f} listed on KickStock at ${p} mUSDT. Fresh shares, who's in?\n${link}${suffix()}`,
    `\u{1F4C8} LISTING: $${d.symbol} ${f} just hit the market at ${p} mUSDT. The bell has rung.\n${link}${suffix()}`,
    `\u{1F4C8} IPO ALERT: ${d.player} ${f} is now tradeable on KickStock. Opening price: ${p} mUSDT.\n${link}${suffix()}`,
  ]);
}

/**
 * @param {{ player: string, symbol: string, amm: string, usdtSeeded: bigint|string, tokensSeeded: bigint|string, txHash: string }} d
 */
function graduated(d) {
  const link = proofLink(d.txHash);
  return pick([
    `\u{1F393} GRADUATED: $${d.symbol} hit the liquidity threshold \u2014 now trading on AMM!\n${link}${suffix()}`,
    `\u{1F393} AMM LIVE: ${d.player} graduated from bonding curve to full AMM trading. LFG.\n${link}${suffix()}`,
    `\u{1F393} UPGRADE: $${d.symbol} is off the curve. AMM pool seeded with ${fmt(d.usdtSeeded)} mUSDT.\n${link}${suffix()}`,
  ]);
}

/**
 * @param {{ player: string, symbol: string, shares: bigint|string, cost: bigint|string, delta: string, txHash: string }} d
 */
function whaleBuy(d) {
  const link = proofLink(d.txHash);
  return pick([
    `\u{1F40B} WHALE: Someone scooped ${d.shares} shares of $${d.symbol}, price +${d.delta}%.\n${link}${suffix()}`,
    `\u{1F40B} BIG BUY: ${d.shares} shares of ${d.player} just got swept. Cost: ${fmt(d.cost)} mUSDT.\n${link}${suffix()}`,
    `\u{1F40B} WHALE ALERT: Massive ${d.shares}-share buy on $${d.symbol}. Someone knows something?\n${link}${suffix()}`,
  ]);
}

/**
 * @param {{ player: string, symbol: string, shares: bigint|string, proceeds: bigint|string, txHash: string }} d
 */
function whaleSell(d) {
  const link = proofLink(d.txHash);
  return pick([
    `\u{1F4C9} DUMP: ${d.shares} shares of $${d.symbol} just hit the market. Proceeds: ${fmt(d.proceeds)} mUSDT.\n${link}${suffix()}`,
    `\u{1F4C9} SELL-OFF: Someone offloaded ${d.shares} shares of ${d.player}. Taking profits?\n${link}${suffix()}`,
    `\u{1F4C9} WHALE EXIT: Big ${d.shares}-share sell on $${d.symbol}. The chart won't like this.\n${link}${suffix()}`,
  ]);
}

/**
 * @param {{ player: string, symbol: string, amount: bigint|string, statType: number, txHash: string }} d
 */
function dividendDistributed(d) {
  const link = proofLink(d.txHash);
  return pick([
    `\u{1F4B8} DIVIDEND! ${d.player} scored \u2014 ${fmt(d.amount)} mUSDT distributed to holders.\n${link}${suffix()}`,
    `\u{1F4B8} PAYOUT: $${d.symbol} holders just earned ${fmt(d.amount)} mUSDT in dividends. Hold to earn.\n${link}${suffix()}`,
    `\u{1F4B8} DIVIDEND DROP: ${fmt(d.amount)} mUSDT flowing to $${d.symbol} holders. Performance pays.\n${link}${suffix()}`,
  ]);
}

/**
 * @param {{ trader: string, usdtIn: boolean, amountIn: bigint|string, amountOut: bigint|string, symbol: string, txHash: string }} d
 */
function swapped(d) {
  const link = proofLink(d.txHash);
  const dir = d.usdtIn ? `mUSDT \u2192 $${d.symbol}` : `$${d.symbol} \u2192 mUSDT`;
  return pick([
    `\u{1F504} SWAP: ${fmt(d.amountIn)} ${dir} on the AMM.\n${link}${suffix()}`,
    `\u{1F504} AMM TRADE: ${dir}, size ${fmt(d.amountIn)}. Liquidity is flowing.\n${link}${suffix()}`,
    `\u{1F504} DEX SWAP: ${dir} just executed on KickStock AMM.\n${link}${suffix()}`,
  ]);
}

/**
 * @param {{ gainers: Array<{symbol: string, delta: string}> }} d
 */
function topGainers(d) {
  const [a, b, c] = d.gainers;
  return pick([
    `\u{1F525} TOP 3 GAINERS:\n\u{1F947}$${a.symbol} +${a.delta}%\n\u{1F948}$${b.symbol} +${b.delta}%\n\u{1F949}$${c.symbol} +${c.delta}%${suffix()}`,
    `\u{1F525} Who's pumping? \u{1F947}$${a.symbol}+${a.delta}% \u{1F948}$${b.symbol}+${b.delta}% \u{1F949}$${c.symbol}+${c.delta}%${suffix()}`,
    `\u{1F525} Today's HOT 3: \u{1F947}${a.symbol} +${a.delta}% \u{1F948}${b.symbol} +${b.delta}% \u{1F949}${c.symbol} +${c.delta}%${suffix()}`,
  ]);
}

/**
 * @param {{ daysLeft: number, leaders: Array<{symbol: string}> }} d
 */
function countdown(d) {
  const [a, b, c] = d.leaders;
  return pick([
    `\u{23F3} ${d.daysLeft} days to kickoff. Market cap leaders: \u{1F947}$${a.symbol} \u{1F948}$${b.symbol} \u{1F949}$${c.symbol}${suffix()}`,
    `\u{23F3} T-${d.daysLeft} until the World Cup. Top holdings: \u{1F947}$${a.symbol} \u{1F948}$${b.symbol} \u{1F949}$${c.symbol}${suffix()}`,
    `\u{23F3} ${d.daysLeft} days remain. Who leads the board? \u{1F947}$${a.symbol} \u{1F948}$${b.symbol} \u{1F949}$${c.symbol}${suffix()}`,
  ]);
}

module.exports = {
  playerListed,
  graduated,
  whaleBuy,
  whaleSell,
  dividendDistributed,
  swapped,
  topGainers,
  countdown,
};
