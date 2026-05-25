'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import OkLinkLink from '@/components/OkLinkLink'
import { INDEXER_URL } from '@/lib/contracts'
import { formatUSDT, shortenAddress } from '@/lib/utils'

const TABS = [
  { key: 'gainers', label: 'Gainers', icon: '\u25B2' },
  { key: 'mcap', label: 'Market Cap', icon: '\u25C9' },
  { key: 'whales', label: 'Whales', icon: '\uD83D\uDC0B' },
  { key: 'dividends', label: 'Dividends', icon: '\uD83D\uDCB0' },
  { key: 'referrals', label: 'Referrals', icon: '\uD83D\uDD17' },
]

const COLUMN_HEADERS = {
  gainers: ['Player', 'Price', '24h Change'],
  mcap: ['Player', 'Price', 'Market Cap'],
  whales: ['Address', 'Holdings', 'Total Value'],
  dividends: ['Player', 'Total Paid', 'Holders'],
  referrals: ['Address', 'Referrals', 'Earnings'],
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState('gainers')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData([])
    fetch(`${INDEXER_URL}/leaderboard?type=${tab}`)
      .then((r) => r.json())
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.entries || res?.data || []
        setData(list)
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [tab])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-surface-200 border border-surface-300 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                : 'text-gray-400 hover:text-white hover:bg-surface-300'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-200 border border-surface-300 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-surface-300 bg-surface-100">
              <th className="text-left p-4 w-12">#</th>
              {COLUMN_HEADERS[tab].map((h) => (
                <th key={h} className={`p-4 ${h === COLUMN_HEADERS[tab][0] ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
              <th className="text-right p-4">Explorer</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500 animate-pulse">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-500">
                  No data available for this category
                </td>
              </tr>
            ) : (
              data.map((entry, i) => (
                <LeaderboardRow key={i} rank={i + 1} entry={entry} tab={tab} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LeaderboardRow({ rank, entry, tab }) {
  const rankColors = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-gray-500'

  if (tab === 'gainers') {
    const change = Number(entry.change24h || entry.priceChange || 0)
    const isPositive = change >= 0
    return (
      <tr className="border-b border-surface-300/50 hover:bg-surface-300/30">
        <td className={`p-4 font-bold font-mono ${rankColors}`}>{rank}</td>
        <td className="p-4">
          <Link href={`/player/${entry.playerId || entry.id}`} className="text-white hover:text-accent-green font-medium">
            {entry.name || entry.symbol || `Player #${entry.playerId || entry.id}`}
          </Link>
        </td>
        <td className="p-4 text-right text-white font-mono">${formatUSDT(entry.currentPrice || entry.price || 0)}</td>
        <td className={`p-4 text-right font-mono font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </td>
        <td className="p-4 text-right">
          {entry.tokenAddress && <OkLinkLink address={entry.tokenAddress} type="address" />}
        </td>
      </tr>
    )
  }

  if (tab === 'mcap') {
    const mcap = Number(entry.marketCap || entry.mcap || 0)
    return (
      <tr className="border-b border-surface-300/50 hover:bg-surface-300/30">
        <td className={`p-4 font-bold font-mono ${rankColors}`}>{rank}</td>
        <td className="p-4">
          <Link href={`/player/${entry.playerId || entry.id}`} className="text-white hover:text-accent-green font-medium">
            {entry.name || entry.symbol || `Player #${entry.playerId || entry.id}`}
          </Link>
        </td>
        <td className="p-4 text-right text-white font-mono">${formatUSDT(entry.currentPrice || entry.price || 0)}</td>
        <td className="p-4 text-right text-white font-mono font-medium">
          ${mcap >= 1e18 ? formatUSDT(BigInt(Math.floor(mcap))) : mcap.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </td>
        <td className="p-4 text-right">
          {entry.tokenAddress && <OkLinkLink address={entry.tokenAddress} type="address" />}
        </td>
      </tr>
    )
  }

  if (tab === 'whales') {
    return (
      <tr className="border-b border-surface-300/50 hover:bg-surface-300/30">
        <td className={`p-4 font-bold font-mono ${rankColors}`}>{rank}</td>
        <td className="p-4 text-white font-mono text-xs">{shortenAddress(entry.address || entry.wallet)}</td>
        <td className="p-4 text-right text-white font-mono">{entry.holdingsCount || entry.holdings || 0}</td>
        <td className="p-4 text-right text-emerald-400 font-mono font-medium">
          ${Number(entry.totalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </td>
        <td className="p-4 text-right">
          <OkLinkLink address={entry.address || entry.wallet} type="address" />
        </td>
      </tr>
    )
  }

  if (tab === 'dividends') {
    return (
      <tr className="border-b border-surface-300/50 hover:bg-surface-300/30">
        <td className={`p-4 font-bold font-mono ${rankColors}`}>{rank}</td>
        <td className="p-4">
          <Link href={`/player/${entry.playerId || entry.id}`} className="text-white hover:text-accent-green font-medium">
            {entry.name || entry.symbol || `Player #${entry.playerId || entry.id}`}
          </Link>
        </td>
        <td className="p-4 text-right text-amber-400 font-mono font-medium">
          ${Number(entry.totalDividends || entry.totalPaid || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </td>
        <td className="p-4 text-right text-white font-mono">{entry.holders || entry.holderCount || 0}</td>
        <td className="p-4 text-right">
          {entry.tokenAddress && <OkLinkLink address={entry.tokenAddress} type="address" />}
        </td>
      </tr>
    )
  }

  if (tab === 'referrals') {
    return (
      <tr className="border-b border-surface-300/50 hover:bg-surface-300/30">
        <td className={`p-4 font-bold font-mono ${rankColors}`}>{rank}</td>
        <td className="p-4 text-white font-mono text-xs">{shortenAddress(entry.address || entry.referrer)}</td>
        <td className="p-4 text-right text-white font-mono">{entry.referralCount || entry.count || 0}</td>
        <td className="p-4 text-right text-emerald-400 font-mono font-medium">
          ${Number(entry.earnings || entry.totalEarnings || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </td>
        <td className="p-4 text-right">
          <OkLinkLink address={entry.address || entry.referrer} type="address" />
        </td>
      </tr>
    )
  }

  return null
}
