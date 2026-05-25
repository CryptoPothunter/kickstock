'use client'

/* Player detail page - skeleton */
import { useState, useEffect, use } from 'react'
import { useReadContract } from 'wagmi'
import TradePanel from '@/components/TradePanel'
import PriceChart from '@/components/PriceChart'
import { ADDRESSES, ABIS, INDEXER_URL } from '@/lib/contracts'
import { formatUSDT, formatShares, countryFlag } from '@/lib/utils'

export default function PlayerPage({ params }) {
  const { id } = use(params)
  const playerId = Number(id)

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
  const price = currentPrice?.toString() || playerData?.currentPrice || '0'

  const priceNum = Number(price) / 1e18
  const supplyNum = Number(supply) / 1e18
  const mcap = priceNum * supplyNum

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {country && <span className="text-3xl">{countryFlag(country)}</span>}
            <div>
              <h1 className="text-3xl font-bold text-white">{name}</h1>
              <p className="text-gray-500">{symbol} {position && `/ ${position}`}</p>
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
        <div>
          <TradePanel playerId={playerId} />
        </div>
      </div>
    </div>
  )
}
