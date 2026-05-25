'use client'

/* IPO page: Graduation progress bars, early-bird cost, and graduated players list */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useReadContract } from 'wagmi'
import { ADDRESSES, ABIS, INDEXER_URL, GRADUATION_THRESHOLD, SHARE_UNIT } from '@/lib/contracts'
import { formatUSDT, countryFlag } from '@/lib/utils'

function PlayerGraduationCard({ player }) {
  const playerId = player.id || player.player_id

  // Read on-chain data
  const { data: playerInfo } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'getPlayerInfo',
    args: [BigInt(playerId)],
  })

  const { data: isGraduated } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'graduated',
    args: [BigInt(playerId)],
  })

  const { data: currentPrice } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'currentPrice',
    args: [BigInt(playerId)],
  })

  const { data: ammAddress } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'playerAmm',
    args: [BigInt(playerId)],
    query: { enabled: !!isGraduated },
  })

  const reserve = playerInfo ? playerInfo[2] : 0n
  const supply = playerInfo ? playerInfo[1] : 0n
  const threshold = GRADUATION_THRESHOLD

  const reserveNum = Number(reserve || 0n) / 1e18
  const thresholdNum = Number(threshold) / 1e18
  const progressPct = Math.min((reserveNum / thresholdNum) * 100, 100)
  const priceNum = Number(currentPrice || 0n) / 1e18
  const supplyNum = Number(supply || 0n)

  // Early bird cost: price of 1st share vs current
  const earlyBirdCost = 100 // BASE = 100 mUSDT (first share cost)

  const name = player.name || `Player #${playerId}`
  const country = player.country || ''

  if (isGraduated) {
    return (
      <div className="bg-surface-200 border border-accent-gold/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {country && <span className="text-lg">{countryFlag(country)}</span>}
            <span className="text-white font-semibold text-sm">{name}</span>
          </div>
          <span className="text-xs text-accent-gold bg-accent-gold/10 px-2 py-1 rounded font-medium">
            GRADUATED
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
          <span>Reserve: {formatUSDT(reserve || 0n)} mUSDT</span>
          <Link href={`/pool/${playerId}`}
            className="text-accent-blue hover:text-accent-blue/80 font-medium">
            Trade on AMM
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {country && <span className="text-lg">{countryFlag(country)}</span>}
          <Link href={`/player/${playerId}`}
            className="text-white font-semibold text-sm hover:text-accent-blue transition-colors">
            {name}
          </Link>
        </div>
        <span className="text-xs text-gray-400">#{playerId}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{formatUSDT(reserve || 0n)} / {thresholdNum.toLocaleString()} mUSDT</span>
          <span>{progressPct.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-surface rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 100
                ? '#f59e0b'
                : progressPct >= 50
                  ? 'linear-gradient(90deg, #22c55e, #3b82f6)'
                  : '#22c55e'
            }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>Price: {priceNum.toFixed(2)} mUSDT</span>
        <span>Supply: {supplyNum}</span>
        <span>Early: {earlyBirdCost} mUSDT</span>
      </div>
    </div>
  )
}

export default function IPOPage() {
  const [players, setPlayers] = useState([])
  const [filter, setFilter] = useState('all') // all, active, graduated

  useEffect(() => {
    fetch(`${INDEXER_URL}/market`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort by reserve descending (closest to graduation first)
          const sorted = data.sort((a, b) => {
            const rA = Number(a.reserve || 0)
            const rB = Number(b.reserve || 0)
            return rB - rA
          })
          setPlayers(sorted)
        }
      })
      .catch(() => {
        // Fallback: just show top player IDs
        const fallback = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Player #${i + 1}` }))
        setPlayers(fallback)
      })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">IPO - Graduation</h1>
          <p className="text-gray-500">
            Players graduate from the bonding curve to an AMM when their reserve reaches 50,000 mUSDT.
            Early birds get the lowest curve price.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">How Graduation Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-accent-green font-medium mb-1">1. Buy Early</div>
            <p className="text-gray-400">Buy shares on the bonding curve. Early buyers get the lowest price (starts at 100 mUSDT).</p>
          </div>
          <div>
            <div className="text-accent-blue font-medium mb-1">2. Build Reserve</div>
            <p className="text-gray-400">Each buy adds to the reserve. The price increases along the curve as more shares are bought.</p>
          </div>
          <div>
            <div className="text-accent-gold font-medium mb-1">3. Graduate</div>
            <p className="text-gray-400">When reserve hits 50,000 mUSDT, anyone can trigger graduation. The reserve seeds an AMM pool.</p>
          </div>
          <div>
            <div className="text-purple-400 font-medium mb-1">4. Trade on AMM</div>
            <p className="text-gray-400">After graduation, trade freely on the AMM. Provide liquidity to earn swap fees.</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'active', 'graduated'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-surface-300 text-white'
                : 'text-gray-400 hover:text-white hover:bg-surface-200'
            }`}
          >
            {f === 'all' ? 'All Players' : f === 'active' ? 'Pre-Graduation' : 'Graduated'}
          </button>
        ))}
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.length > 0 ? (
          players.slice(0, 60).map((player) => (
            <PlayerGraduationCard
              key={player.id || player.player_id}
              player={player}
            />
          ))
        ) : (
          <p className="text-gray-500 col-span-3 text-center py-8">Loading players...</p>
        )}
      </div>
    </div>
  )
}
