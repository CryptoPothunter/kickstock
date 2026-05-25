'use client'

/* Pool page: AMM reserves, price, swap + LP for a graduated player */
import { useState, useEffect, use } from 'react'
import { useReadContract } from 'wagmi'
import Link from 'next/link'
import SwapPanel from '@/components/SwapPanel'
import LPPanel from '@/components/LPPanel'
import { ADDRESSES, ABIS, INDEXER_URL } from '@/lib/contracts'
import { formatUSDT } from '@/lib/utils'

export default function PoolPage({ params }) {
  const { id } = use(params)
  const playerId = Number(id)

  const [playerData, setPlayerData] = useState(null)

  // Read graduation status
  const { data: isGraduated } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'graduated',
    args: [BigInt(playerId)],
  })

  // Read AMM address
  const { data: ammAddress } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'playerAmm',
    args: [BigInt(playerId)],
  })

  // Read player info
  const { data: playerInfo } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'getPlayerInfo',
    args: [BigInt(playerId)],
  })

  // AMM data (only if graduated)
  const hasAmm = ammAddress && ammAddress !== '0x0000000000000000000000000000000000000000'

  const { data: reserveUsdt } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'reserveUsdt',
    query: { enabled: !!hasAmm },
  })
  const { data: reserveToken } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'reserveToken',
    query: { enabled: !!hasAmm },
  })
  const { data: ammPrice } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'price',
    query: { enabled: !!hasAmm },
  })
  const { data: totalLpSupply } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'totalSupply',
    query: { enabled: !!hasAmm },
  })
  const { data: kValue } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'getK',
    query: { enabled: !!hasAmm },
  })

  // Fetch from indexer
  useEffect(() => {
    fetch(`${INDEXER_URL}/player/${playerId}`)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setPlayerData(data) })
      .catch(() => {})
  }, [playerId])

  const tokenAddress = playerInfo ? playerInfo[0] : null
  const name = playerData?.name || `Player #${playerId}`

  if (!isGraduated) {
    return (
      <div className="space-y-6">
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{name} - Pool</h1>
          <p className="text-gray-400 mb-4">This player has not graduated yet.</p>
          <p className="text-gray-500 text-sm mb-6">
            The AMM pool opens when the bonding curve reserve reaches 50,000 mUSDT.
          </p>
          <Link href={`/player/${playerId}`}
            className="text-accent-blue hover:text-accent-blue/80 text-sm font-medium">
            View Player Market
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{name}</h1>
          <p className="text-gray-500">AMM Pool (Graduated)</p>
        </div>
        <Link href={`/player/${playerId}`}
          className="text-accent-blue hover:text-accent-blue/80 text-sm font-medium">
          View Player Page
        </Link>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
          <p className="text-xs text-gray-500">AMM Price</p>
          <p className="text-xl font-bold text-accent-green">{formatUSDT(ammPrice || 0n)} mUSDT</p>
        </div>
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
          <p className="text-xs text-gray-500">USDT Reserve</p>
          <p className="text-xl font-bold text-white">{formatUSDT(reserveUsdt || 0n)}</p>
        </div>
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
          <p className="text-xs text-gray-500">Token Reserve</p>
          <p className="text-xl font-bold text-white">{formatUSDT(reserveToken || 0n)}</p>
        </div>
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total LP Supply</p>
          <p className="text-xl font-bold text-white">{formatUSDT(totalLpSupply || 0n)}</p>
        </div>
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
          <p className="text-xs text-gray-500">k = x * y</p>
          <p className="text-xl font-bold text-white truncate" title={kValue?.toString()}>
            {kValue ? (Number(kValue) / 1e36).toFixed(2) : '0'}
          </p>
        </div>
      </div>

      {/* AMM contract address */}
      <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">AMM Contract</p>
        <p className="text-sm font-mono text-gray-300 break-all">{ammAddress}</p>
      </div>

      {/* Swap + LP panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SwapPanel ammAddress={ammAddress} tokenAddress={tokenAddress} />
        <LPPanel ammAddress={ammAddress} tokenAddress={tokenAddress} />
      </div>
    </div>
  )
}
