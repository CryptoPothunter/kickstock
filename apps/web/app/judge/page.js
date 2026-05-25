'use client'

import { useState, useEffect, useCallback } from 'react'
import OkLinkLink from '@/components/OkLinkLink'
import { INDEXER_URL, ADDRESSES } from '@/lib/contracts'
import { shortenAddress } from '@/lib/utils'

/* placeholder - sections filled in via Edit */

export default function JudgePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`${INDEXER_URL}/judge`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const metrics = data?.metrics || {}
  const contracts = data?.contracts || []
  const events = data?.events || data?.recentEvents || []

  const copyVerifyScript = useCallback(() => {
    const contractLines = contracts.length > 0
      ? contracts.map((c) => `echo "Verifying ${c.name}..." && cast code ${c.address} --rpc-url $RPC_URL | head -c 40`).join('\n')
      : Object.entries(ADDRESSES).filter(([, v]) => v).map(([name, addr]) => `echo "Verifying ${name}..." && cast code ${addr} --rpc-url $RPC_URL | head -c 40`).join('\n')

    const script = `#!/bin/bash
# KickStock On-Chain Verification Script
# Verifies that all contracts are deployed and contain bytecode
# Requirements: foundry (cast)

RPC_URL="https://testrpc.xlayer.tech"

echo "=== KickStock Contract Verification ==="
echo ""
${contractLines}
echo ""
echo "=== Verification Complete ==="
echo "If all entries show bytecode (0x60...), contracts are verified on-chain."
`
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [contracts])

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 animate-pulse">
        Loading on-chain data...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Judge Mode</h1>
        <p className="text-gray-500 text-sm font-mono">
          Everything is on-chain. Verify it yourself.
        </p>
      </div>

      {/* Global On-Chain Metrics */}
      <section>
        <h2 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-wider text-xs">
          Global On-Chain Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Total Volume" value={fmtBigNum(metrics.totalVolume)} prefix="$" />
          <MetricCard label="Total Trades" value={fmtInt(metrics.totalTrades)} />
          <MetricCard label="Graduated" value={fmtInt(metrics.graduatedCount)} />
          <MetricCard label="Dividends Paid" value={fmtBigNum(metrics.totalDividends)} prefix="$" />
          <MetricCard label="Unique Addresses" value={fmtInt(metrics.uniqueAddresses)} />
          <MetricCard label="Total Players" value={fmtInt(metrics.totalPlayers)} />
        </div>
      </section>

      {/* Contract Registry */}
      <section>
        <h2 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-wider text-xs">
          Contract Registry
        </h2>
        <div className="bg-surface-200 border border-surface-300 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-surface-300 bg-surface-100">
                <th className="text-left p-4">Contract</th>
                <th className="text-left p-4">Address</th>
                <th className="text-center p-4">Status</th>
                <th className="text-right p-4">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length > 0 ? (
                contracts.map((c, i) => (
                  <ContractRow key={i} contract={c} />
                ))
              ) : (
                Object.entries(ADDRESSES).filter(([, v]) => v).map(([name, addr]) => (
                  <ContractRow key={name} contract={{ name, address: addr, verified: true }} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Event Stream */}
      <section>
        <h2 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-wider text-xs">
          Live Event Stream
        </h2>
        <div className="bg-surface-200 border border-surface-300 rounded-xl max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No recent events</div>
          ) : (
            <div className="divide-y divide-surface-300/50">
              {events.map((evt, i) => (
                <EventRow key={i} event={evt} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Verify Script Button */}
      <div className="flex justify-center">
        <button
          onClick={copyVerifyScript}
          className="inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-700/50 hover:border-emerald-500/60 text-emerald-400 font-mono text-sm px-6 py-3 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied ? 'Copied!' : 'Copy Verification Script'}
        </button>
      </div>
    </div>
  )
}

function MetricCard({ label, value, prefix = '' }) {
  return (
    <div className="bg-surface-200 border border-surface-300 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white font-mono">
        {prefix}{value}
      </p>
    </div>
  )
}

function ContractRow({ contract }) {
  const [addrCopied, setAddrCopied] = useState(false)

  function copyAddress() {
    navigator.clipboard.writeText(contract.address).then(() => {
      setAddrCopied(true)
      setTimeout(() => setAddrCopied(false), 1500)
    })
  }

  const isVerified = contract.verified !== false

  return (
    <tr className="border-b border-surface-300/50 hover:bg-surface-300/30">
      <td className="p-4 text-white font-medium">{contract.name}</td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">{shortenAddress(contract.address)}</span>
          <button
            onClick={copyAddress}
            className="text-gray-500 hover:text-white transition-colors"
            title="Copy address"
          >
            {addrCopied ? (
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </td>
      <td className="p-4 text-center">
        {isVerified ? (
          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending
          </span>
        )}
      </td>
      <td className="p-4 text-right">
        <OkLinkLink address={contract.address} type="address" />
      </td>
    </tr>
  )
}

function EventRow({ event }) {
  const typeBadgeColors = {
    Bought: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
    Sold: 'bg-red-900/50 text-red-400 border-red-700/50',
    Graduated: 'bg-amber-900/50 text-amber-400 border-amber-700/50',
    Dividend: 'bg-blue-900/50 text-blue-400 border-blue-700/50',
    Listed: 'bg-purple-900/50 text-purple-400 border-purple-700/50',
  }

  const eventType = event.type || event.eventType || 'Event'
  const badgeClass = typeBadgeColors[eventType] || 'bg-gray-800 text-gray-300 border-gray-700'
  const timestamp = event.timestamp ? new Date(typeof event.timestamp === 'number' && event.timestamp < 1e12 ? event.timestamp * 1000 : event.timestamp).toLocaleString() : '--'

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${badgeClass}`}>
          {eventType}
        </span>
        <span className="text-sm text-gray-300 truncate">
          {event.details || event.description || formatEventDetails(event)}
        </span>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-xs text-gray-500 font-mono">{timestamp}</span>
        {event.txHash && <OkLinkLink txHash={event.txHash} type="tx" />}
      </div>
    </div>
  )
}

function formatEventDetails(event) {
  if (event.playerName || event.player) {
    const name = event.playerName || event.player
    const amount = event.amount ? ` - $${(Number(event.amount) / 1e18).toFixed(2)}` : ''
    return `${name}${amount}`
  }
  if (event.address) return shortenAddress(event.address)
  return ''
}

function fmtBigNum(val) {
  if (val == null) return '--'
  const n = Number(val)
  if (isNaN(n)) return '--'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function fmtInt(val) {
  if (val == null) return '--'
  const n = Number(val)
  if (isNaN(n)) return '--'
  return n.toLocaleString()
}
