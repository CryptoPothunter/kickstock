'use client'

import Link from 'next/link'
import { formatUSDT, formatShares, countryFlag } from '@/lib/utils'

export default function PlayerCard({ player }) {
  const price = player.currentPrice || player.price || '0'
  const supply = player.supply || '0'
  const volume24h = player.volume24h || player.volume || '0'

  return (
    <Link href={`/player/${player.playerId || player.id}`}>
      <div className="bg-surface-200 border border-surface-300 rounded-xl p-4 hover:border-accent-green/40 transition-all hover:shadow-lg hover:shadow-accent-green/5 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{countryFlag(player.country)}</span>
              <h3 className="font-semibold text-white group-hover:text-accent-green transition-colors">
                {player.name || player.symbol}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{player.position || 'FWD'}</p>
          </div>
          <span className="text-xs bg-surface-300 text-gray-400 px-2 py-0.5 rounded font-mono">
            #{player.playerId || player.id}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Price</p>
            <p className="text-white font-medium">${formatUSDT(price)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Supply</p>
            <p className="text-white font-medium">{formatShares(supply)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Vol 24h</p>
            <p className="text-white font-medium">${formatUSDT(volume24h)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
