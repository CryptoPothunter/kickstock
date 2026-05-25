'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useReadContract } from 'wagmi'
import StatsBar from '@/components/StatsBar'
import PlayerCard from '@/components/PlayerCard'
import GasCostBadge from '@/components/GasCostBadge'
import { ADDRESSES, ABIS, INDEXER_URL } from '@/lib/contracts'
import { formatUSDT } from '@/lib/utils'

export default function HomePage() {
  const [stats, setStats] = useState(null)
  const [topMovers, setTopMovers] = useState([])

  // Fallback: read listed count from chain
  const { data: listedCount } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'listedCount',
  })

  useEffect(() => {
    fetch(`${INDEXER_URL}/stats`).then(r => r.json()).then(setStats).catch(() => {
      if (listedCount != null) {
        setStats({ totalPlayers: Number(listedCount), totalVolume: 0, totalTraders: 0 })
      }
    })
    fetch(`${INDEXER_URL}/players?sort=volume&limit=5`).then(r => r.json()).then(data => {
      setTopMovers(Array.isArray(data) ? data : data?.players || [])
    }).catch(() => {})
  }, [listedCount])

  const displayStats = stats || {
    totalPlayers: listedCount != null ? Number(listedCount) : '--',
    totalVolume: '--',
    totalTraders: '--',
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-16">
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-4">
          <span className="gradient-text">Own the players.</span>
          <br />
          <span className="text-white">Trade the Cup.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
          Buy and sell shares of football players on a bonding curve. Earn dividends from real match performance. Built on X Layer.
        </p>
        <div className="flex items-center justify-center gap-4 mb-8">
          <Link
            href="/market"
            className="bg-accent-green hover:bg-accent-green/80 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Explore Market
          </Link>
          <Link
            href="/faucet"
            className="bg-surface-200 border border-surface-300 hover:border-accent-green/40 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Get Test mUSDT
          </Link>
        </div>
        <GasCostBadge />
      </section>

      {/* Stats */}
      <section>
        <StatsBar stats={displayStats} />
      </section>

      {/* Top Movers */}
      {topMovers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Top Movers</h2>
            <Link href="/market" className="text-accent-green text-sm hover:underline">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topMovers.slice(0, 5).map((player) => (
              <PlayerCard key={player.playerId || player.id} player={player} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
