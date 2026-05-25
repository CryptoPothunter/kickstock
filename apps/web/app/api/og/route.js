import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:4000/api'

async function fetchData(path) {
  try {
    const res = await fetch(`${INDEXER_URL}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'player'
  const id = searchParams.get('id')
  const refCode = searchParams.get('refCode')

  if (type === 'player') return playerOG(id, refCode)
  if (type === 'portfolio') return portfolioOG(id, refCode)
  if (type === 'index') return indexOG(id, refCode)

  return playerOG(id, refCode)
}

async function playerOG(id, refCode) {
  const data = id ? await fetchData(`/player/${id}`) : null
  const name = data?.name || `Player #${id || '?'}`
  const country = data?.country || ''
  const price = data?.currentPrice ? (Number(data.currentPrice) / 1e18).toFixed(2) : '0.00'
  const change = data?.change24h != null ? Number(data.change24h).toFixed(2) : '0.00'
  const isUp = Number(change) >= 0
  const dividendPool = data?.dividendPool ? (Number(data.dividendPool) / 1e18).toFixed(2) : '0.00'

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#0a0a0f', padding: '60px', fontFamily: 'monospace', color: 'white' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', background: 'linear-gradient(90deg, #00d26a, #3b82f6)', backgroundClip: 'text', color: 'transparent' }}>
              KickStock
            </div>
          </div>
          {refCode && (
            <div style={{ display: 'flex', fontSize: '16px', color: '#6b7280', border: '1px solid #374151', padding: '6px 16px', borderRadius: '8px' }}>
              ref: {refCode}
            </div>
          )}
        </div>

        {/* Player info */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            {country && <div style={{ fontSize: '48px' }}>{country}</div>}
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'white' }}>{name}</div>
          </div>

          <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Price</div>
              <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#00d26a' }}>${price}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>24h Change</div>
              <div style={{ fontSize: '40px', fontWeight: 'bold', color: isUp ? '#00d26a' : '#ef4444' }}>
                {isUp ? '+' : ''}{change}%
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Dividend Pool</div>
              <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f59e0b' }}>${dividendPool}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '16px', color: '#4b5563' }}>
          @KickStock
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

async function portfolioOG(address, refCode) {
  const data = address ? await fetchData(`/portfolio/${address}`) : null
  const holdings = Array.isArray(data) ? data : data?.holdings || []
  const totalValue = holdings.reduce((sum, h) => {
    const p = Number(h.currentPrice || h.price || 0) / 1e18
    const s = Number(h.shares || h.balance || 0) / 1e18
    return sum + p * s
  }, 0)
  const totalDividends = holdings.reduce((sum, h) => sum + Number(h.claimedDividends || 0) / 1e18, 0)
  const top3 = holdings.slice(0, 3)

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#0a0a0f', padding: '60px', fontFamily: 'monospace', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', background: 'linear-gradient(90deg, #00d26a, #3b82f6)', backgroundClip: 'text', color: 'transparent' }}>
            KickStock Portfolio
          </div>
          {refCode && (
            <div style={{ display: 'flex', fontSize: '16px', color: '#6b7280', border: '1px solid #374151', padding: '6px 16px', borderRadius: '8px' }}>
              ref: {refCode}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '60px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Total Holdings Value</div>
              <div style={{ fontSize: '52px', fontWeight: 'bold', color: '#00d26a' }}>${totalValue.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Dividends Claimed</div>
              <div style={{ fontSize: '52px', fontWeight: 'bold', color: '#f59e0b' }}>${totalDividends.toFixed(2)}</div>
            </div>
          </div>

          {top3.length > 0 && (
            <div style={{ display: 'flex', gap: '20px' }}>
              {top3.map((h, i) => (
                <div key={i} style={{ display: 'flex', padding: '16px 24px', border: '1px solid #1f2937', borderRadius: '12px', backgroundColor: '#111118' }}>
                  <div style={{ fontSize: '18px', color: 'white' }}>
                    {h.name || h.symbol || `Player #${h.playerId || h.id}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '16px', color: '#4b5563' }}>
          @KickStock
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

async function indexOG(id, refCode) {
  const data = id ? await fetchData(`/index/${id}`) : null
  const name = data?.name || `Index #${id || '?'}`
  const nav = data?.nav ? (Number(data.nav) / 1e18).toFixed(2) : '0.00'
  const components = data?.components || []

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#0a0a0f', padding: '60px', fontFamily: 'monospace', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', background: 'linear-gradient(90deg, #00d26a, #3b82f6)', backgroundClip: 'text', color: 'transparent' }}>
            KickStock Index
          </div>
          {refCode && (
            <div style={{ display: 'flex', fontSize: '16px', color: '#6b7280', border: '1px solid #374151', padding: '6px 16px', borderRadius: '8px' }}>
              ref: {refCode}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>{name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>NAV</div>
            <div style={{ fontSize: '52px', fontWeight: 'bold', color: '#00d26a' }}>${nav}</div>
          </div>

          {components.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {components.slice(0, 6).map((c, i) => (
                <div key={i} style={{ display: 'flex', padding: '8px 16px', border: '1px solid #1f2937', borderRadius: '8px', backgroundColor: '#111118', fontSize: '14px', color: '#9ca3af' }}>
                  {c.name || c.symbol || `#${c.playerId}`}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '16px', color: '#4b5563' }}>
          @KickStock
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
