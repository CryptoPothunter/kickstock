'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/market', label: 'Market' },
  { href: '/ipo', label: 'IPO' },
  { href: '/indices', label: 'Indices' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/judge', label: 'Judge' },
  { href: '/faucet', label: 'Faucet' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-surface-300 bg-surface-100/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text">KickStock</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-surface-300 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-surface-200'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
        </div>
      </div>
    </nav>
  )
}
