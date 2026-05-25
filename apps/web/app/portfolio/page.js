'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import Link from 'next/link'
import { ADDRESSES, ABIS, INDEXER_URL } from '@/lib/contracts'
import { formatUSDT, formatShares } from '@/lib/utils'

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(false)

  const { data: balance } = useReadContract({
    address: ADDRESSES.MockUSDT,
    abi: ABIS.MockUSDT,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address },
  })

  useEffect(() => {
    if (!address) return
    setLoading(true)
    fetch(`${INDEXER_URL}/portfolio/${address}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.holdings || []
        setHoldings(list)
      })
      .catch(() => setHoldings([]))
      .finally(() => setLoading(false))
  }, [address])

  const totalValue = holdings.reduce((sum, h) => {
    const price = Number(h.currentPrice || h.price || 0) / 1e18
    const shares = Number(h.shares || h.balance || 0) / 1e18
    return sum + price * shares
  }, 0)

  const totalPending = holdings.reduce((sum, h) => sum + Number(h.pendingDividends || 0) / 1e18, 0)

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-4">Portfolio</h1>
        <p className="text-gray-500">Connect your wallet to view your portfolio</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Portfolio</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
          <p className="text-sm text-gray-500">mUSDT Balance</p>
          <p className="text-2xl font-bold text-white">${formatUSDT(balance)}</p>
        </div>
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
          <p className="text-sm text-gray-500">Holdings Value</p>
          <p className="text-2xl font-bold text-accent-green">${totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
          <p className="text-sm text-gray-500">Pending Dividends</p>
          <p className="text-2xl font-bold text-accent-gold">${totalPending.toFixed(2)}</p>
        </div>
      </div>

      {/* Holdings */}
      {loading ? (
        <div className="text-center py-10 text-gray-500 animate-pulse">Loading holdings...</div>
      ) : holdings.length === 0 ? (
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-10 text-center">
          <p className="text-gray-500 mb-4">No holdings yet</p>
          <Link href="/market" className="text-accent-green hover:underline text-sm">
            Browse the market &rarr;
          </Link>
        </div>
      ) : (
        <div className="bg-surface-200 border border-surface-300 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-surface-300 bg-surface-100">
                <th className="text-left p-4">Player</th>
                <th className="text-right p-4">Shares</th>
                <th className="text-right p-4">Price</th>
                <th className="text-right p-4">Value</th>
                <th className="text-right p-4">Dividends</th>
                <th className="text-right p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const price = Number(h.currentPrice || h.price || 0) / 1e18
                const shares = Number(h.shares || h.balance || 0) / 1e18
                const value = price * shares
                const pending = Number(h.pendingDividends || 0) / 1e18

                return (
                  <HoldingRow key={i} holding={h} price={price} shares={shares} value={value} pending={pending} />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function HoldingRow({ holding, price, shares, value, pending }) {
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  function handleClaim() {
    if (!holding.tokenAddress) return
    writeContract({
      address: holding.tokenAddress,
      abi: ABIS.PlayerToken,
      functionName: 'claim',
    })
  }

  return (
    <tr className="border-b border-surface-300/50 hover:bg-surface-300/30">
      <td className="p-4">
        <Link href={`/player/${holding.playerId || holding.id}`} className="text-white hover:text-accent-green font-medium">
          {holding.name || holding.symbol || `Player #${holding.playerId || holding.id}`}
        </Link>
      </td>
      <td className="p-4 text-right text-white">{Math.floor(shares).toLocaleString()}</td>
      <td className="p-4 text-right text-gray-300">${price.toFixed(2)}</td>
      <td className="p-4 text-right text-white font-medium">${value.toFixed(2)}</td>
      <td className="p-4 text-right text-accent-gold">${pending.toFixed(4)}</td>
      <td className="p-4 text-right">
        {pending > 0 && (
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className="bg-accent-gold/20 text-accent-gold text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-accent-gold/30 transition-colors disabled:opacity-50"
          >
            {isPending || isConfirming ? '...' : isSuccess ? 'Claimed!' : 'Claim'}
          </button>
        )}
      </td>
    </tr>
  )
}
