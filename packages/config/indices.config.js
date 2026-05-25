/**
 * KickStock M10 — Index / ETF Configuration
 *
 * Defines index families for the IndexVault:
 *   - NATIONAL (48): One index per qualified nation
 *   - POSITION (4): FW / MF / DF / GK
 *   - CONTINENTAL (6): AFC / CAF / CONCACAF / CONMEBOL / UEFA / OFC-Playoff
 *   - ALLSTAR (1): World Cup 500 All-Stars (top 20 players)
 *
 * Weights are in BPS (sum = 10_000 per index).
 * Components reference player IDs from players.config.js.
 */

const { PLAYERS, PLAYERS_BY_COUNTRY } = require('./players.config');

// ═══════════════════════════════════════════════════════════════
// ██  HELPER: equal-weight distribution
// ═══════════════════════════════════════════════════════════════

function equalWeights(count) {
  const base = Math.floor(10000 / count);
  const remainder = 10000 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

// ═══════════════════════════════════════════════════════════════
// ██  NATIONAL INDICES (48 nations)
// ═══════════════════════════════════════════════════════════════

const COUNTRY_CODES = [
  'ARG', 'BRA', 'FRA', 'ENG', 'ESP', 'GER', 'NED', 'POR',
  'BEL', 'CRO', 'ITA', 'URU', 'COL', 'JPN', 'KOR', 'USA',
  'MEX', 'CAN', 'MAR', 'SEN', 'NGA', 'EGY', 'CMR', 'CIV',
  'ALG', 'GHA', 'TUN', 'KSA', 'IRN', 'AUS', 'QAT', 'IRQ',
  'UZB', 'SUI', 'DEN', 'POL', 'AUT', 'TUR', 'SRB', 'UKR',
  'ECU', 'PAR', 'PAN', 'CRC', 'JAM', 'NOR', 'SWE', 'SCO',
];

const NATIONAL_INDICES = COUNTRY_CODES.map(code => {
  const players = (PLAYERS_BY_COUNTRY[code] || []);
  if (players.length === 0) return null;
  const components = players.map(p => p.id);
  const weights = equalWeights(components.length);
  const countryName = players[0].countryName;
  return {
    name: `${countryName} National Squad`,
    kind: 'NATIONAL',
    components,
    weightBps: weights,
  };
}).filter(Boolean);

// ═══════════════════════════════════════════════════════════════
// ██  POSITION INDICES (4 positions)
// ═══════════════════════════════════════════════════════════════

const POSITION_MAP = { FW: [], MF: [], DF: [], GK: [] };
PLAYERS.forEach(p => {
  if (POSITION_MAP[p.position]) POSITION_MAP[p.position].push(p.id);
});

const POSITION_INDICES = Object.entries(POSITION_MAP)
  .filter(([, ids]) => ids.length > 0)
  .map(([pos, ids]) => {
    // Take top 20 by ID (star-ranked)
    const top = ids.slice(0, 20);
    return {
      name: `${pos} Position Index`,
      kind: 'POSITION',
      components: top,
      weightBps: equalWeights(top.length),
    };
  });

// ═══════════════════════════════════════════════════════════════
// ██  CONTINENTAL INDICES (6 confederations)
// ═══════════════════════════════════════════════════════════════

const CONFEDERATION = {
  AFC:       ['JPN', 'KOR', 'AUS', 'IRN', 'KSA', 'IRQ', 'QAT', 'UZB'],
  CAF:       ['MAR', 'SEN', 'NGA', 'EGY', 'CMR', 'CIV', 'ALG', 'GHA', 'TUN'],
  CONCACAF:  ['USA', 'MEX', 'CAN', 'PAN', 'CRC', 'JAM'],
  CONMEBOL:  ['ARG', 'BRA', 'URU', 'COL', 'ECU', 'PAR'],
  UEFA:      ['FRA', 'ENG', 'ESP', 'GER', 'NED', 'POR', 'BEL', 'CRO', 'ITA',
              'SUI', 'DEN', 'POL', 'AUT', 'TUR', 'SRB', 'UKR', 'NOR', 'SWE', 'SCO'],
  PLAYOFF:   [], // placeholder for play-off spots
};

const CONTINENTAL_INDICES = Object.entries(CONFEDERATION)
  .filter(([, codes]) => codes.length > 0)
  .map(([confed, codes]) => {
    // Collect all players from member nations, take top 20
    const allPlayers = codes.flatMap(c => (PLAYERS_BY_COUNTRY[c] || []).map(p => p.id));
    const top = allPlayers.slice(0, 20);
    if (top.length === 0) return null;
    return {
      name: `${confed} Continental Index`,
      kind: 'CONTINENTAL',
      components: top,
      weightBps: equalWeights(top.length),
    };
  })
  .filter(Boolean);

// ═══════════════════════════════════════════════════════════════
// ██  WORLD CUP 500 ALL-STARS (top 20 superstars)
// ═══════════════════════════════════════════════════════════════

const ALLSTAR_IDS = [
  1,   // Messi
  6,   // Vinicius Jr
  11,  // Mbappe
  16,  // Bellingham
  21,  // Yamal
  26,  // Wirtz
  34,  // Ronaldo
  38,  // De Bruyne
  57,  // Son
  80,  // Salah
  142, // Haaland
  116, // Lewandowski
  77,  // Osimhen
  41,  // Modric
  17,  // Kane
  30,  // Van Dijk
  60,  // Pulisic
  70,  // Hakimi
  48,  // Valverde
  151, // Lautaro
];

const ALLSTAR_INDEX = {
  name: 'World Cup 500 All-Stars',
  kind: 'ALLSTAR',
  components: ALLSTAR_IDS,
  weightBps: equalWeights(ALLSTAR_IDS.length),
};

// ═══════════════════════════════════════════════════════════════
// ██  ALL INDICES COMBINED
// ═══════════════════════════════════════════════════════════════

const ALL_INDICES = [
  ...NATIONAL_INDICES,
  ...POSITION_INDICES,
  ...CONTINENTAL_INDICES,
  ALLSTAR_INDEX,
];

// Assign sequential IDs (for reference)
ALL_INDICES.forEach((idx, i) => { idx.id = i + 1; });

module.exports = {
  NATIONAL_INDICES,
  POSITION_INDICES,
  CONTINENTAL_INDICES,
  ALLSTAR_INDEX,
  ALL_INDICES,
  equalWeights,
};
