import { parseAbi } from 'viem'

const {
  PlayerMarket_ABI,
  PlayerToken_ABI,
  PlayerAMM_ABI,
  MockUSDT_ABI,
  PerformanceOracle_ABI,
  IndexVault_ABI,
  IndexToken_ABI,
} = require('@kickstock/abi')

export const ADDRESSES = {
  MockUSDT: process.env.NEXT_PUBLIC_MOCK_USDT || '0x4F51c373145bdd8F3EFbD90f4c3409CC2f1Ea851',
  PlayerTokenFactory: process.env.NEXT_PUBLIC_PLAYER_TOKEN_FACTORY || '0x8d2b077ca39CaAdBE6a659128943106e784D8BD7',
  'PlayerToken (impl)': '0xA177d2c0669eD77FF2FED4e820412fB6b9643364',
  PlayerMarket: process.env.NEXT_PUBLIC_PLAYER_MARKET || '0xd98B4e5296c66aE56c55C5A4c1e9EB0DD512196f',
  PerformanceOracle: process.env.NEXT_PUBLIC_PERFORMANCE_ORACLE || '0xF1277da9b1F4b7b72A3A16EC8C17a00Ce702C056',
  IndexVault: process.env.NEXT_PUBLIC_INDEX_VAULT || '',
}

export const ABIS = {
  PlayerMarket: parseAbi(PlayerMarket_ABI),
  PlayerToken: parseAbi(PlayerToken_ABI),
  PlayerAMM: parseAbi(PlayerAMM_ABI),
  MockUSDT: parseAbi(MockUSDT_ABI),
  PerformanceOracle: parseAbi(PerformanceOracle_ABI),
  IndexVault: parseAbi(IndexVault_ABI),
  IndexToken: parseAbi(IndexToken_ABI),
}

export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:4000/api'

export const SHARE_UNIT = BigInt('1000000000000000000') // 1e18

// Graduation threshold: 50,000 mUSDT
export const GRADUATION_THRESHOLD = BigInt('50000000000000000000000')
