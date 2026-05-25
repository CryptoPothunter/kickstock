'use client'

import { useEffect, useState } from 'react'

export default function GasCostBadge() {
  const [okbPrice, setOkbPrice] = useState(null)

  useEffect(() => {
    fetch('/api/okx-price')
      .then((r) => r.json())
      .then((data) => {
        if (data.price) setOkbPrice(Number(data.price))
      })
      .catch(() => {})
  }, [])

  const gasCostOKB = 0.000005
  const gasCostUSD = okbPrice ? (gasCostOKB * okbPrice).toFixed(4) : '0.001'

  return (
    <span className="inline-flex items-center gap-1.5 bg-accent-green/10 text-accent-green text-xs font-medium px-2.5 py-1 rounded-full border border-accent-green/20">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Gas: ~${gasCostUSD}
    </span>
  )
}
