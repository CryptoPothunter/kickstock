import { NextResponse } from 'next/server'
import crypto from 'crypto'

const API_KEY = process.env.OKX_API_KEY || '02543fec-afe0-4186-87cf-f137f112247d'
const SECRET_KEY = process.env.OKX_SECRET_KEY || 'E7B78265E16D0DFEA8C0410E4B0C5E84'
const PASSPHRASE = process.env.OKX_PASSPHRASE || 'Gf888888@'

// OKX DEX uses chain 196 for X Layer
const OKB_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' // native token
const USDT_TOKEN = '0x1E4a5963aBFD975d8c9021ce480b42188849D41d' // USDT on X Layer

function sign(timestamp, method, requestPath, body = '') {
  const prehash = timestamp + method + requestPath + body
  return crypto.createHmac('sha256', SECRET_KEY).update(prehash).digest('base64')
}

let cachedPrice = null
let cachedAt = 0
const CACHE_TTL = 60_000 // 1 minute

export async function GET() {
  const now = Date.now()

  if (cachedPrice && now - cachedAt < CACHE_TTL) {
    return NextResponse.json({ price: cachedPrice, cached: true })
  }

  try {
    const timestamp = new Date().toISOString()
    const requestPath = `/api/v5/dex/aggregator/quote?chainId=196&fromTokenAddress=${OKB_TOKEN}&toTokenAddress=${USDT_TOKEN}&amount=1000000000000000000&slippage=0.01`
    const method = 'GET'

    const signature = sign(timestamp, method, requestPath)

    const url = `https://www.okx.com${requestPath}`
    const res = await fetch(url, {
      headers: {
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': PASSPHRASE,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json()

    if (data?.data?.[0]?.toTokenAmount) {
      const toAmount = Number(data.data[0].toTokenAmount)
      const toDecimals = Number(data.data[0].toToken?.decimals || 6)
      const price = toAmount / Math.pow(10, toDecimals)
      cachedPrice = price
      cachedAt = now
      return NextResponse.json({ price })
    }

    // Fallback price if API fails
    return NextResponse.json({ price: 12.5, fallback: true })
  } catch (error) {
    return NextResponse.json({ price: 12.5, fallback: true, error: error.message })
  }
}
