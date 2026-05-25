import { fetchAPI } from '@/lib/utils'

export async function generateMetadata({ params }) {
  const { id } = await params
  const data = await fetchAPI(`/player/${id}`)
  const name = data?.name || `Player #${id}`
  const price = data?.currentPrice ? (Number(data.currentPrice) / 1e18).toFixed(2) : '0.00'

  const ogUrl = `/api/og?type=player&id=${id}`

  return {
    title: `${name} - KickStock`,
    description: `Trade ${name} shares on KickStock. Current price: $${price}`,
    openGraph: {
      title: `${name} - KickStock`,
      description: `Trade ${name} shares on KickStock. Current price: $${price}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} - KickStock`,
      description: `Trade ${name} shares on KickStock. Current price: $${price}`,
      images: [ogUrl],
    },
  }
}

export default function PlayerLayout({ children }) {
  return children
}
