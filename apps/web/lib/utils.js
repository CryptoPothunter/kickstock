import { formatUnits } from 'viem'

export function formatUSDT(wei, decimals = 2) {
  if (wei == null) return '0.00'
  return Number(formatUnits(BigInt(wei), 18)).toFixed(decimals)
}

export function formatShares(wei) {
  if (wei == null) return '0'
  return Math.floor(Number(formatUnits(BigInt(wei), 18))).toLocaleString()
}

export function parseShares(amount) {
  return BigInt(amount) * BigInt('1000000000000000000')
}

export function parseUSDTInput(amount) {
  const parts = String(amount).split('.')
  const whole = parts[0] || '0'
  const frac = (parts[1] || '').padEnd(18, '0').slice(0, 18)
  return BigInt(whole) * BigInt('1000000000000000000') + BigInt(frac)
}

export function shortenAddress(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export function countryFlag(code) {
  if (!code) return ''
  const flags = {
    ARG: '\uD83C\uDDE6\uD83C\uDDF7', BRA: '\uD83C\uDDE7\uD83C\uDDF7',
    FRA: '\uD83C\uDDEB\uD83C\uDDF7', GER: '\uD83C\uDDE9\uD83C\uDDEA',
    ESP: '\uD83C\uDDEA\uD83C\uDDF8', ENG: '\uD83C\uDDEC\uD83C\uDDE7',
    POR: '\uD83C\uDDF5\uD83C\uDDF9', ITA: '\uD83C\uDDEE\uD83C\uDDF9',
    NED: '\uD83C\uDDF3\uD83C\uDDF1', BEL: '\uD83C\uDDE7\uD83C\uDDEA',
    URU: '\uD83C\uDDFA\uD83C\uDDFE', COL: '\uD83C\uDDE8\uD83C\uDDF4',
    CRO: '\uD83C\uDDED\uD83C\uDDF7', SEN: '\uD83C\uDDF8\uD83C\uDDF3',
    MAR: '\uD83C\uDDF2\uD83C\uDDE6', JPN: '\uD83C\uDDEF\uD83C\uDDF5',
    KOR: '\uD83C\uDDF0\uD83C\uDDF7', AUS: '\uD83C\uDDE6\uD83C\uDDFA',
    MEX: '\uD83C\uDDF2\uD83C\uDDFD', USA: '\uD83C\uDDFA\uD83C\uDDF8',
    CAN: '\uD83C\uDDE8\uD83C\uDDE6', POL: '\uD83C\uDDF5\uD83C\uDDF1',
    NGA: '\uD83C\uDDF3\uD83C\uDDEC', GHA: '\uD83C\uDDEC\uD83C\uDDED',
    CMR: '\uD83C\uDDE8\uD83C\uDDF2', CIV: '\uD83C\uDDE8\uD83C\uDDEE',
    EGY: '\uD83C\uDDEA\uD83C\uDDEC', ALG: '\uD83C\uDDE9\uD83C\uDDFF',
    TUN: '\uD83C\uDDF9\uD83C\uDDF3', CHI: '\uD83C\uDDE8\uD83C\uDDF1',
    PAR: '\uD83C\uDDF5\uD83C\uDDFE', ECU: '\uD83C\uDDEA\uD83C\uDDE8',
    PER: '\uD83C\uDDF5\uD83C\uDDEA', VEN: '\uD83C\uDDFB\uD83C\uDDEA',
    SUI: '\uD83C\uDDE8\uD83C\uDDED', AUT: '\uD83C\uDDE6\uD83C\uDDF9',
    SWE: '\uD83C\uDDF8\uD83C\uDDEA', DEN: '\uD83C\uDDE9\uD83C\uDDF0',
    NOR: '\uD83C\uDDF3\uD83C\uDDF4', WAL: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F',
    SCO: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F',
    SRB: '\uD83C\uDDF7\uD83C\uDDF8',
  }
  return flags[code] || code
}

export async function fetchAPI(path) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:4000/api'}${path}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
