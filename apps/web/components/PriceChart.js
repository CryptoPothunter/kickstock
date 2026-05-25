'use client'

import { useMemo } from 'react'

export default function PriceChart({ pricePoints, width = 600, height = 200 }) {
  const chartData = useMemo(() => {
    if (!pricePoints || pricePoints.length === 0) return null

    const prices = pricePoints.map((p) => Number(p.price || p))
    const times = pricePoints.map((p, i) => p.timestamp || i)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const range = maxP - minP || 1

    const padding = { top: 20, bottom: 30, left: 10, right: 10 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const points = prices.map((p, i) => {
      const x = padding.left + (i / Math.max(prices.length - 1, 1)) * chartW
      const y = padding.top + chartH - ((p - minP) / range) * chartH
      return `${x},${y}`
    })

    const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt}`).join(' ')

    const lastPoint = points[points.length - 1].split(',')
    const firstPoint = points[0].split(',')
    const areaD = `${pathD} L${lastPoint[0]},${padding.top + chartH} L${firstPoint[0]},${padding.top + chartH} Z`

    const isUp = prices[prices.length - 1] >= prices[0]
    const color = isUp ? '#00d26a' : '#ff4757'

    return { pathD, areaD, color, minP, maxP, prices }
  }, [pricePoints, width, height])

  if (!chartData) {
    return (
      <div
        className="bg-surface-200 rounded-xl flex items-center justify-center text-gray-500"
        style={{ width, height }}
      >
        No price data available
      </div>
    )
  }

  return (
    <div className="bg-surface-200 rounded-xl p-3 border border-surface-300">
      <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartData.color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={chartData.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={chartData.areaD} fill="url(#areaGrad)" />
        <path d={chartData.pathD} fill="none" stroke={chartData.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="15" y={height - 5} fill="#6b7280" fontSize="11" fontFamily="monospace">
          Low: ${chartData.minP.toFixed(2)}
        </text>
        <text x={width - 15} y={height - 5} fill="#6b7280" fontSize="11" fontFamily="monospace" textAnchor="end">
          High: ${chartData.maxP.toFixed(2)}
        </text>
      </svg>
    </div>
  )
}
