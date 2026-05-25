import './globals.css'
import Providers from './providers'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'KickStock - Own the Players. Trade the Cup.',
  description: 'Trade football player shares on the blockchain. Bonding curve market with real-time dividends.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-200 antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
