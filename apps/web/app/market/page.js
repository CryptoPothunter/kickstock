'use client'

import { useState, useEffect, useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import PlayerCard from '@/components/PlayerCard'
import { ADDRESSES, ABIS, INDEXER_URL, SHARE_UNIT } from '@/lib/contracts'
import { formatUSDT } from '@/lib/utils'

export default function MarketPage() {
  const [players, setPlayers] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [posFilter, setPosFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [useChain, setUseChain] = useState(false)

  // Try indexer first
  useEffect(() => {
    fetch(`${INDEXER_URL}/players`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.players || []
        if (list.length > 0) {
          setPlayers(list)
          setLoading(false)
        } else {
          setUseChain(true)
        }
      })
      .catch(() => setUseChain(true))
  }, [])

  // Fallback: read from chain
  const { data: listedCount } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'listedCount',
    query: { enabled: useChain },
  })

  const playerCount = listedCount ? Number(listedCount) : 0
  const playerIds = useMemo(() => Array.from({ length: Math.min(playerCount, 50) }, (_, i) => i + 1), [playerCount])

  const { data: chainPlayers } = useReadContracts({
    contracts: playerIds.flatMap((id) => [
      {
        address: ADDRESSES.PlayerMarket,
        abi: ABIS.PlayerMarket,
        functionName: 'getPlayerInfo',
        args: [BigInt(id)],
      },
      {
        address: ADDRESSES.PlayerMarket,
        abi: ABIS.PlayerMarket,
        functionName: 'currentPrice',
        args: [BigInt(id)],
      },
    ]),
    query: { enabled: useChain && playerCount > 0 },
  })

  useEffect(() => {
    if (chainPlayers && useChain) {
      const list = []
      for (let i = 0; i < playerIds.length; i++) {
        const info = chainPlayers[i * 2]
        const price = chainPlayers[i * 2 + 1]
        if (info?.result && info.result[0] !== '0x0000000000000000000000000000000000000000') {
          list.push({
            playerId: playerIds[i],
            id: playerIds[i],
            name: `Player #${playerIds[i]}`,
            symbol: `P${playerIds[i]}`,
            token: info.result[0],
            supply: info.result[1]?.toString() || '0',
            reserve: info.result[2]?.toString() || '0',
            currentPrice: price?.result?.toString() || '0',
            volume24h: '0',
          })
        }
      }
      setPlayers(list)
      setLoading(false)
    }
  }, [chainPlayers, useChain, playerIds])

  const filtered = useMemo(() => {
    let result = [...players]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.symbol || '').toLowerCase().includes(q) ||
          (p.country || '').toLowerCase().includes(q)
      )
    }
    if (posFilter) {
      result = result.filter((p) => (p.position || '').toUpperCase() === posFilter.toUpperCase())
    }
    result.sort((a, b) => {
      if (sortBy === 'price') return Number(b.currentPrice || b.price || 0) - Number(a.currentPrice || a.price || 0)
      if (sortBy === 'volume') return Number(b.volume24h || b.volume || 0) - Number(a.volume24h || a.volume || 0)
      if (sortBy === 'mcap') {
        const mcapA = (Number(a.currentPrice || a.price || 0) * Number(a.supply || 0)) / 1e36
        const mcapB = (Number(b.currentPrice || b.price || 0) * Number(b.supply || 0)) / 1e36
        return mcapB - mcapA
      }
      return (a.playerId || a.id || 0) - (b.playerId || b.id || 0)
    })
    return result
  }, [players, search, sortBy, posFilter])

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Player Market</h1>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-green/50 w-48"
          />
          <select
            value={posFilter}
            onChange={(e) => setPosFilter(e.target.value)}
            className="bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
          >
            <option value="">All Positions</option>
            <option value="GK">GK</option>
            <option value="DEF">DEF</option>
            <option value="MID">MID</option>
            <option value="FWD">FWD</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface-200 border border-surface-300 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
          >
            <option value="id">Sort: ID</option>
            <option value="price">Sort: Price</option>
            <option value="volume">Sort: Volume</option>
            <option value="mcap">Sort: Market Cap</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <div className="animate-pulse text-lg">Loading players...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No players found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((player) => (
            <PlayerCard key={player.playerId || player.id} player={player} />
          ))}
        </div>
      )}
    </div>
  )
}
