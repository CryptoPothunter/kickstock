'use client'

/* TradePanel: Buy/Sell shares for a player */
/* Sections filled in via Edit below */

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ADDRESSES, ABIS, SHARE_UNIT } from '@/lib/contracts'
import { formatUSDT, parseShares } from '@/lib/utils'
import GasCostBadge from './GasCostBadge'

export default function TradePanel({ playerId }) {
  const [tab, setTab] = useState('buy')
  const [amount, setAmount] = useState('')
  const { address, isConnected } = useAccount()

  const shares = amount ? parseShares(Number(amount)) : BigInt(0)

  // Read quote for buy
  const { data: buyQuote } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'quoteBuy',
    args: [BigInt(playerId), shares],
    query: { enabled: shares > 0n && tab === 'buy' },
  })

  // Read quote for sell
  const { data: sellQuote } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'quoteSell',
    args: [BigInt(playerId), shares],
    query: { enabled: shares > 0n && tab === 'sell' },
  })

  // Read mUSDT allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.MockUSDT,
    abi: ABIS.MockUSDT,
    functionName: 'allowance',
    args: [address, ADDRESSES.PlayerMarket],
    query: { enabled: !!address },
  })

  // Read mUSDT balance
  const { data: balance } = useReadContract({
    address: ADDRESSES.MockUSDT,
    abi: ABIS.MockUSDT,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address },
  })

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) {
      setAmount('')
      refetchAllowance()
      reset()
    }
  }, [isSuccess, refetchAllowance, reset])

  const totalCost = buyQuote ? buyQuote[0] : BigInt(0)
  const buyFee = buyQuote ? buyQuote[1] : BigInt(0)
  const netProceeds = sellQuote ? sellQuote[0] : BigInt(0)
  const sellFee = sellQuote ? sellQuote[1] : BigInt(0)

  const needsApproval = tab === 'buy' && totalCost > 0n && (allowance || BigInt(0)) < totalCost

  function handleApprove() {
    writeContract({
      address: ADDRESSES.MockUSDT,
      abi: ABIS.MockUSDT,
      functionName: 'approve',
      args: [ADDRESSES.PlayerMarket, totalCost * 2n],
    })
  }

  function handleBuy() {
    if (shares <= 0n) return
    const maxCost = (totalCost * 105n) / 100n // 5% slippage
    writeContract({
      address: ADDRESSES.PlayerMarket,
      abi: ABIS.PlayerMarket,
      functionName: 'buy',
      args: [BigInt(playerId), shares, maxCost],
    })
  }

  function handleSell() {
    if (shares <= 0n) return
    const minProceeds = (netProceeds * 95n) / 100n // 5% slippage
    writeContract({
      address: ADDRESSES.PlayerMarket,
      abi: ABIS.PlayerMarket,
      functionName: 'sell',
      args: [BigInt(playerId), shares, minProceeds],
    })
  }

  const busy = isPending || isConfirming

  return (
    <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Trade</h3>
        <GasCostBadge />
      </div>

      {/* Tabs */}
      <div className="flex bg-surface rounded-lg p-1 mb-4">
        <button
          onClick={() => { setTab('buy'); reset() }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'buy' ? 'bg-accent-green/20 text-accent-green' : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => { setTab('sell'); reset() }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'sell' ? 'bg-accent-red/20 text-accent-red' : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Number of Shares</label>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full bg-surface border border-surface-300 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-accent-green/50 transition-colors"
        />
      </div>

      {/* Quote */}
      {shares > 0n && (
        <div className="bg-surface rounded-lg p-3 mb-4 space-y-2 text-sm">
          {tab === 'buy' ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Cost</span>
                <span className="text-white font-medium">${formatUSDT(totalCost)} mUSDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fee</span>
                <span className="text-gray-300">${formatUSDT(buyFee)} mUSDT</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Proceeds</span>
                <span className="text-white font-medium">${formatUSDT(netProceeds)} mUSDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fee</span>
                <span className="text-gray-300">${formatUSDT(sellFee)} mUSDT</span>
              </div>
            </>
          )}
          {balance != null && (
            <div className="flex justify-between border-t border-surface-300 pt-2">
              <span className="text-gray-400">Your Balance</span>
              <span className="text-gray-300">${formatUSDT(balance)} mUSDT</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!isConnected ? (
        <p className="text-center text-gray-500 text-sm py-3">Connect wallet to trade</p>
      ) : tab === 'buy' ? (
        needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={busy}
            className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-blue hover:bg-accent-blue/80 text-white transition-colors disabled:opacity-50"
          >
            {busy ? 'Approving...' : 'Approve mUSDT'}
          </button>
        ) : (
          <button
            onClick={handleBuy}
            disabled={busy || shares <= 0n}
            className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-green hover:bg-accent-green/80 text-white transition-colors disabled:opacity-50"
          >
            {busy ? 'Buying...' : `Buy ${amount || 0} Shares`}
          </button>
        )
      ) : (
        <button
          onClick={handleSell}
          disabled={busy || shares <= 0n}
          className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-red hover:bg-accent-red/80 text-white transition-colors disabled:opacity-50"
        >
          {busy ? 'Selling...' : `Sell ${amount || 0} Shares`}
        </button>
      )}

      {isSuccess && (
        <p className="text-accent-green text-sm text-center mt-3">Transaction confirmed!</p>
      )}
    </div>
  )
}
