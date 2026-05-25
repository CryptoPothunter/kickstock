'use client'

import { shortenAddress } from '@/lib/utils'

const OKLINK_BASE = 'https://www.oklink.com/xlayer-test'

export default function OkLinkLink({ txHash, address, type = 'tx', children, className = '' }) {
  const href = type === 'tx'
    ? `${OKLINK_BASE}/tx/${txHash}`
    : `${OKLINK_BASE}/address/${address}`

  const display = children || shortenAddress(txHash || address)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-xs transition-colors ${className}`}
    >
      <span>{display}</span>
      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}
