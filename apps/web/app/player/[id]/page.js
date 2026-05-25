'use client'

/* Player detail page - with graduation + AMM integration */
import { useState, useEffect, use } from 'react'
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import Link from 'next/link'
import TradePanel from '@/components/TradePanel'
import SwapPanel from '@/components/SwapPanel'
import PriceChart from '@/components/PriceChart'
import { ADDRESSES, ABIS, INDEXER_URL, GRADUATION_THRESHOLD } from '@/lib/contracts'
import { formatUSDT, formatShares, countryFlag } from '@/lib/utils'

export default function PlayerPage({ params }) {
  const { id } = use(params)
  const playerId = Number(id)
  const { address } = useAccount()

  const [playerData, setPlayerData] = useState(null)
  const [pricePoints, setPricePoints] = useState([])
  const [trades, setTrades] = useState([])
  const [dividends, setDividends] = useState([])

  // Read from chain
  const { data: playerInfo } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'getPlayerInfo',
    args: [BigInt(playerId)],
  })

  const { data: currentPrice } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'currentPrice',
    args: [BigInt(playerId)],
  })

  // M7: Graduation status
  const { data: isGraduated } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'graduated',
    args: [BigInt(playerId)],
  })

  const { data: ammAddress } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'playerAmm',
    args: [BigInt(playerId)],
    query: { enabled: !!isGraduated },
  })

  const { data: canGraduate } = useReadContract({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'canGraduate',
    args: [BigInt(playerId)],
  })

  const { data: ammPrice } = useReadContract({
    address: ammAddress,
    abi: ABIS.PlayerAMM,
    functionName: 'price',
    query: { enabled: !!ammAddress && ammAddress !== '0x0000000000000000000000000000000000000000' },
  })

  // Graduate action
  const { writeContract, data: gradTxHash, isPending: gradPending } = useWriteContract()
  const { isLoading: gradConfirming, isSuccess: gradSuccess } = useWaitForTransactionReceipt({ hash: gradTxHash })

  function handleGraduate() {
    writeContract({
      address: ADDRESSES.PlayerMarket,
      abi: ABIS.PlayerMarket,
      functionName: 'graduate',
      args: [BigInt(playerId)],
    })
  }

  // Fetch from indexer
  useEffect(() => {
    fetch(`${INDEXER_URL}/player/${playerId}`)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error) setPlayerData(data) })
      .catch(() => {})

    fetch(`${INDEXER_URL}/player/${playerId}/price_points`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPricePoints(data) })
      .catch(() => {})

    fetch(`${INDEXER_URL}/player/${playerId}/trades`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrades(data) })
      .catch(() => {})

    fetch(`${INDEXER_URL}/player/${playerId}/dividends`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDividends(data) })
      .catch(() => {})
  }, [playerId])

  const name = playerData?.name || `Player #${playerId}`
  const symbol = playerData?.symbol || `P${playerId}`
  const country = playerData?.country || ''
  const position = playerData?.position || ''
  const supply = playerInfo ? playerInfo[1]?.toString() : playerData?.supply || '0'
  const reserve = playerInfo ? playerInfo[2] : 0n

  // Use AMM price if graduated, otherwise curve price
  const displayPrice = isGraduated && ammPrice ? ammPrice : currentPrice
  const price = displayPrice?.toString() || playerData?.currentPrice || '0'

  const priceNum = Number(price) / 1e18
  const supplyNum = Number(supply) / 1e18
  const mcap = priceNum * supplyNum

  // Graduation progress
  const reserveNum = Number(reserve || 0n) / 1e18
  const thresholdNum = Number(GRADUATION_THRESHOLD) / 1e18
  const progressPct = Math.min((reserveNum / thresholdNum) * 100, 100)

  const tokenAddress = playerInfo ? playerInfo[0] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {country && <span className="text-3xl">{countryFlag(country)}</span>}
            <div>
              <h1 className="text-3xl font-bold text-white">{name}</h1>
              <p className="text-gray-500">
                {symbol} {position && `/ ${position}`}
                {isGraduated && (
                  <span className="ml-2 text-xs text-accent-gold bg-accent-gold/10 px-2 py-0.5 rounded">
                    GRADUATED
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="text-2xl font-bold text-accent-green">${formatUSDT(price)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Market Cap</p>
            <p className="text-2xl font-bold text-white">${mcap.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Supply</p>
            <p className="text-2xl font-bold text-white">{formatShares(supply)}</p>
          </div>
        </div>
      </div>

      {/* Graduation Progress Bar (if not graduated) */}
      {!isGraduated && (
        <div className="bg-surface-200 border border-surface-300 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Graduation Progress</h3>
            <span className="text-xs text-gray-400">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-surface rounded-full h-3 mb-2">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: progressPct >= 100
                  ? '#f59e0b'
                  : 'linear-gradient(90deg, #22c55e, #3b82f6)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Reserve: {formatUSDT(reserve || 0n)} mUSDT</span>
            <span>Threshold: {thresholdNum.toLocaleString()} mUSDT</span>
          </div>
          {canGraduate && (
            <button
              onClick={handleGraduate}
              disabled={gradPending || gradConfirming}
              className="mt-3 w-full py-2 rounded-lg font-semibold text-sm bg-accent-gold hover:bg-accent-gold/80 text-black transition-colors disabled:opacity-50"
            >
              {gradPending || gradConfirming ? 'Graduating...' : 'Trigger Graduation'}
            </button>
          )}
          {gradSuccess && (
            <p className="text-accent-green text-sm text-center mt-2">Graduation complete! AMM is live.</p>
          )}
        </div>
      )}

      {/* Pool link for graduated */}
      {isGraduated && ammAddress && (
        <div className="bg-surface-200 border border-accent-gold/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-white text-sm">This player has graduated to an AMM pool.</span>
          <Link href={`/pool/${playerId}`}
            className="text-accent-blue hover:text-accent-blue/80 text-sm font-medium">
            View Pool / Swap / LP
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart + Trades (left 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <PriceChart pricePoints={pricePoints.length > 0 ? pricePoints : [{ price: priceNum }, { price: priceNum }]} />

          {/* Recent Trades */}
          <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
            {trades.length === 0 ? (
              <p className="text-gray-500 text-sm">No trades yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-300">
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Trader</th>
                      <th className="text-right py-2">Shares</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 20).map((t, i) => (
                      <tr key={i} className="border-b border-surface-300/50">
                        <td className={`py-2 font-medium ${t.type === 'buy' ? 'text-accent-green' : 'text-accent-red'}`}>
                          {t.type === 'buy' ? 'BUY' : 'SELL'}
                        </td>
                        <td className="py-2 text-gray-400 font-mono text-xs">
                          {t.trader ? `${t.trader.slice(0, 6)}...${t.trader.slice(-4)}` : '--'}
                        </td>
                        <td className="py-2 text-right text-white">{formatShares(t.amount)}</td>
                        <td className="py-2 text-right text-white">${formatUSDT(t.cost || t.proceeds)}</td>
                        <td className="py-2 text-right text-gray-500 text-xs">
                          {t.timestamp ? new Date(t.timestamp * 1000).toLocaleString() : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dividends */}
          {dividends.length > 0 && (
            <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Dividend History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-300">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Stat</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.map((d, i) => (
                      <tr key={i} className="border-b border-surface-300/50">
                        <td className="py-2 text-gray-400 text-xs">
                          {d.timestamp ? new Date(d.timestamp * 1000).toLocaleString() : '--'}
                        </td>
                        <td className="py-2 text-white">{d.statType || '--'}</td>
                        <td className="py-2 text-right text-accent-gold">${formatUSDT(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Trade Panel (right 1/3) */}
        <div className="space-y-6">
          {isGraduated ? (
            <SwapPanel ammAddress={ammAddress} tokenAddress={tokenAddress} />
          ) : (
            <TradePanel playerId={playerId} />
          )}
        </div>
      </div>
    </div>
  )
}
