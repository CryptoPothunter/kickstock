export const metadata = {
  title: 'Portfolio - KickStock',
  description: 'View your KickStock portfolio holdings, dividends, and performance.',
  openGraph: {
    title: 'My Portfolio - KickStock',
    description: 'View your KickStock portfolio holdings, dividends, and performance.',
    images: [{ url: '/api/og?type=portfolio', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Portfolio - KickStock',
    description: 'View your KickStock portfolio holdings, dividends, and performance.',
    images: ['/api/og?type=portfolio'],
  },
}

export default function PortfolioLayout({ children }) {
  return children
}
