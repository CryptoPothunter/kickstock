import { parseAbi } from 'viem'

const {
  PlayerMarket_ABI,
  PlayerToken_ABI,
  MockUSDT_ABI,
  PerformanceOracle_ABI,
} = require('@kickstock/abi')

export const ADDRESSES = {
  PlayerMarket: process.env.NEXT_PUBLIC_PLAYER_MARKET,
  MockUSDT: process.env.NEXT_PUBLIC_MOCK_USDT,
  PerformanceOracle: process.env.NEXT_PUBLIC_PERFORMANCE_ORACLE,
}

export const ABIS = {
  PlayerMarket: parseAbi(PlayerMarket_ABI),
  PlayerToken: parseAbi(PlayerToken_ABI),
  MockUSDT: parseAbi(MockUSDT_ABI),
  PerformanceOracle: parseAbi(PerformanceOracle_ABI),
}

export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:4000/api'

export const SHARE_UNIT = BigInt('1000000000000000000') // 1e18
