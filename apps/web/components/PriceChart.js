'use client'

import { useMemo, useState, useCallback, useRef } from 'react'

export default function PriceChart({ pricePoints, width = 600, height = 200 }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const svgRef = useRef(null)

  const chartData = useMemo(() => {
    if (!pricePoints || pricePoints.length === 0) return null

    const prices = pricePoints.map((p) => Number(p.price || p))
    const times = pricePoints.map((p, i) => p.timestamp || null)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const range = maxP - minP || 1

    const padding = { top: 24, bottom: 36, left: 60, right: 16 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const points = prices.map((p, i) => {
      const x = padding.left + (i / Math.max(prices.length - 1, 1)) * chartW
      const y = padding.top + chartH - ((p - minP) / range) * chartH
      return { x, y }
    })

    const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ')

    const lastPt = points[points.length - 1]
    const firstPt = points[0]
    const areaD = `${pathD} L${lastPt.x},${padding.top + chartH} L${firstPt.x},${padding.top + chartH} Z`

    const isUp = prices[prices.length - 1] >= prices[0]
    const color = isUp ? '#00d26a' : '#ff4757'

    // Y-axis labels (5 ticks)
    const yTicks = []
    const tickCount = 4
    for (let i = 0; i <= tickCount; i++) {
      const val = minP + (range * i) / tickCount
      const y = padding.top + chartH - (i / tickCount) * chartH
      yTicks.push({ val, y })
    }

    // X-axis labels (up to 5)
    const xTicks = []
    const xTickCount = Math.min(prices.length - 1, 4)
    for (let i = 0; i <= xTickCount; i++) {
      const idx = Math.round((i / xTickCount) * (prices.length - 1))
      const x = points[idx].x
      const ts = times[idx]
      let label = ''
      if (ts && typeof ts === 'number' && ts > 1000000) {
        const d = new Date(ts < 1e12 ? ts * 1000 : ts)
        label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      } else {
        label = `${idx + 1}`
      }
      xTicks.push({ x, label })
    }

    // Grid lines
    const gridLines = yTicks.map((t) => ({
      y: t.y,
      x1: padding.left,
      x2: width - padding.right,
    }))

    return { pathD, areaD, color, minP, maxP, prices, points, yTicks, xTicks, gridLines, padding, chartH, chartW, times }
  }, [pricePoints, width, height])

  const handleMouseMove = useCallback(
    (e) => {
      if (!chartData || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = width / rect.width
      const mouseX = (e.clientX - rect.left) * scaleX
      const { padding, points } = chartData

      // Find nearest point
      let closest = 0
      let minDist = Infinity
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - mouseX)
        if (dist < minDist) {
          minDist = dist
          closest = i
        }
      }
      setHoverIndex(closest)
    },
    [chartData, width]
  )

  const handleMouseLeave = useCallback(() => setHoverIndex(null), [])

  if (!chartData) {
    return (
      <div
        className="bg-surface-200 border border-surface-300 rounded-xl flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        No price data available
      </div>
    )
  }

  const hoverPoint = hoverIndex != null ? chartData.points[hoverIndex] : null
  const hoverPrice = hoverIndex != null ? chartData.prices[hoverIndex] : null
  const hoverTime = hoverIndex != null ? chartData.times[hoverIndex] : null

  return (
    <div className="bg-surface-200 rounded-xl p-3 border border-surface-300 relative">
      {/* Hover tooltip */}
      {hoverPoint && hoverPrice != null && (
        <div className="absolute top-2 left-16 bg-surface-100 border border-surface-300 rounded-lg px-3 py-1.5 text-xs z-10 pointer-events-none">
          <span className="text-white font-mono font-medium">${hoverPrice.toFixed(4)}</span>
          {hoverTime && typeof hoverTime === 'number' && hoverTime > 1000000 && (
            <span className="text-gray-500 ml-2">
              {new Date(hoverTime < 1e12 ? hoverTime * 1000 : hoverTime).toLocaleString()}
            </span>
          )}
        </div>
      )}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-auto"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartData.color} stopOpacity="0.25" />
            <stop offset="50%" stopColor={chartData.color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={chartData.color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {chartData.gridLines.map((g, i) => (
          <line
            key={i}
            x1={g.x1}
            y1={g.y}
            x2={g.x2}
            y2={g.y}
            stroke="#1f2937"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <path d={chartData.areaD} fill="url(#areaGradient)" />

        {/* Price line */}
        <path
          d={chartData.pathD}
          fill="none"
          stroke={chartData.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Y-axis labels */}
        {chartData.yTicks.map((t, i) => (
          <text
            key={i}
            x={chartData.padding.left - 8}
            y={t.y + 4}
            fill="#6b7280"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            ${t.val.toFixed(2)}
          </text>
        ))}

        {/* X-axis labels */}
        {chartData.xTicks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={height - 8}
            fill="#6b7280"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {t.label}
          </text>
        ))}

        {/* Crosshair */}
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.x}
              y1={chartData.padding.top}
              x2={hoverPoint.x}
              y2={chartData.padding.top + chartData.chartH}
              stroke="#4b5563"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <line
              x1={chartData.padding.left}
              y1={hoverPoint.y}
              x2={width - chartData.padding.right}
              y2={hoverPoint.y}
              stroke="#4b5563"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="5"
              fill={chartData.color}
              stroke="#0a0a0f"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  )
}
