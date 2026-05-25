'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useReadContract, useReadContracts } from 'wagmi'
import { ADDRESSES, ABIS, SHARE_UNIT } from '@/lib/contracts'
import { formatUnits } from 'viem'

const KIND_LABELS = ['National', 'Position', 'Continental', 'All-Star', 'Custom']
const KIND_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-amber-500/20 text-amber-400',
  'bg-gray-500/20 text-gray-400',
]

function formatUSDT(val) {
  if (!val) return '—'
  const n = Number(formatUnits(val, 18))
  return n < 0.01 ? '<0.01' : n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function IndicesPage() {
  const vaultAddr = ADDRESSES.IndexVault

  // Read index count
  const { data: indexCount } = useReadContract({
    address: vaultAddr,
    abi: ABIS.IndexVault,
    functionName: 'indexCount',
    query: { enabled: !!vaultAddr },
  })

  const count = indexCount ? Number(indexCount) : 0

  // Read all index IDs
  const idCalls = Array.from({ length: count }, (_, i) => ({
    address: vaultAddr,
    abi: ABIS.IndexVault,
    functionName: 'indexIds',
    args: [BigInt(i)],
  }))

  const { data: indexIdResults } = useReadContracts({
    contracts: idCalls,
    query: { enabled: count > 0 },
  })

  const ids = (indexIdResults || []).map(r => r.result).filter(Boolean)

  // Read index details for each ID
  const detailCalls = ids.flatMap(id => [
    { address: vaultAddr, abi: ABIS.IndexVault, functionName: 'getIndex', args: [id] },
    { address: vaultAddr, abi: ABIS.IndexVault, functionName: 'nav', args: [id] },
  ])

  const { data: detailResults } = useReadContracts({
    contracts: detailCalls,
    query: { enabled: ids.length > 0 },
  })

  // Parse index data
  const indices = ids.map((id, i) => {
    const detail = detailResults?.[i * 2]?.result
    const navResult = detailResults?.[i * 2 + 1]?.result
    if (!detail) return null
    const [name, kind, basketToken, components, weightBps, active] = detail
    return { id, name, kind, basketToken, components, weightBps, active, nav: navResult }
  }).filter(Boolean)

  // Filter tabs
  const [activeTab, setActiveTab] = useState('all')
  const filtered = activeTab === 'all'
    ? indices
    : indices.filter(idx => KIND_LABELS[idx.kind]?.toLowerCase() === activeTab)

  const tabs = ['all', 'national', 'position', 'continental', 'all-star', 'custom']

  const noVault = !vaultAddr

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Index / ETF</h1>
          <p className="text-gray-400 mt-1">
            Tokenized index baskets — national squads, position groups, continental leagues, and all-star picks
          </p>
        </div>
      </div>

      {noVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
          IndexVault not deployed yet. Set <code>NEXT_PUBLIC_INDEX_VAULT</code> in your environment to enable on-chain data.
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-surface-300 text-white'
                : 'text-gray-400 hover:text-white hover:bg-surface-200'
            }`}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Indices" value={count} />
        <StatCard label="National" value={indices.filter(i => i.kind === 0).length} />
        <StatCard label="Position" value={indices.filter(i => i.kind === 1).length} />
        <StatCard label="All-Star" value={indices.filter(i => i.kind === 3).length} />
      </div>

      {/* Index grid */}
      {filtered.length === 0 && !noVault ? (
        <div className="text-center py-16 text-gray-500">
          No indices found. Deploy IndexVault and define indices first.
        </div>
      ) : noVault ? (
        <FallbackIndices />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(idx => (
            <IndexCard key={idx.id.toString()} idx={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

function IndexCard({ idx }) {
  return (
    <Link href={`/index/${idx.id}`}>
      <div className="bg-surface-100 border border-surface-300 rounded-xl p-5 hover:border-green-500/50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${KIND_COLORS[idx.kind] || KIND_COLORS[4]}`}>
            {KIND_LABELS[idx.kind] || 'Custom'}
          </span>
          {!idx.active && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">Inactive</span>
          )}
        </div>
        <h3 className="text-white font-semibold text-lg mb-2 truncate">{idx.name}</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{idx.components?.length || 0} components</span>
          <span className="text-white font-medium">
            NAV: {formatUSDT(idx.nav)} mUSDT
          </span>
        </div>
      </div>
    </Link>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-surface-100 border border-surface-300 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

// Fallback display when vault isn't deployed — shows the config data
function FallbackIndices() {
  const families = [
    { name: 'National Squad Indices', kind: 0, count: 48, desc: 'One index per qualified World Cup nation' },
    { name: 'Position Indices', kind: 1, count: 4, desc: 'FW / MF / DF / GK — top players by position' },
    { name: 'Continental Indices', kind: 2, count: 5, desc: 'AFC / CAF / CONCACAF / CONMEBOL / UEFA' },
    { name: 'World Cup 500 All-Stars', kind: 3, count: 1, desc: 'Top 20 global superstars' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {families.map(f => (
        <div key={f.name} className="bg-surface-100 border border-surface-300 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${KIND_COLORS[f.kind]}`}>
              {KIND_LABELS[f.kind]}
            </span>
            <span className="text-gray-500 text-xs">{f.count} indices</span>
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">{f.name}</h3>
          <p className="text-gray-400 text-sm">{f.desc}</p>
          <div className="mt-3 text-xs text-gray-500">Deploy IndexVault to enable trading</div>
        </div>
      ))}
    </div>
  )
}
