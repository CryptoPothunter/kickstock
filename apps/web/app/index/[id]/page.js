'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useReadContract, useReadContracts, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { ADDRESSES, ABIS, SHARE_UNIT } from '@/lib/contracts'
import { formatUnits, parseUnits } from 'viem'
import Link from 'next/link'

const KIND_LABELS = ['National', 'Position', 'Continental', 'All-Star', 'Custom']
const KIND_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-amber-500/20 text-amber-400',
  'bg-gray-500/20 text-gray-400',
]

function fmt(val, dec = 2) {
  if (!val && val !== 0n) return '—'
  return Number(formatUnits(val, 18)).toLocaleString(undefined, { maximumFractionDigits: dec })
}

export default function IndexDetailPage() {
  const params = useParams()
  const indexId = BigInt(params.id || 0)
  const vaultAddr = ADDRESSES.IndexVault
  const { address: userAddr, isConnected } = useAccount()

  // Read index details
  const { data: indexData, refetch: refetchIndex } = useReadContract({
    address: vaultAddr,
    abi: ABIS.IndexVault,
    functionName: 'getIndex',
    args: [indexId],
    query: { enabled: !!vaultAddr },
  })

  // Read NAV
  const { data: navValue, refetch: refetchNav } = useReadContract({
    address: vaultAddr,
    abi: ABIS.IndexVault,
    functionName: 'nav',
    args: [indexId],
    query: { enabled: !!vaultAddr },
  })

  // Read component values
  const { data: compValues, refetch: refetchComp } = useReadContract({
    address: vaultAddr,
    abi: ABIS.IndexVault,
    functionName: 'componentValues',
    args: [indexId],
    query: { enabled: !!vaultAddr },
  })

  // Parse index
  const [name, kind, basketToken, components, weightBps, active] = indexData || []

  // Read user basket token balance
  const { data: userBasketBal, refetch: refetchBal } = useReadContract({
    address: basketToken,
    abi: ABIS.IndexToken,
    functionName: 'balanceOf',
    args: [userAddr],
    query: { enabled: !!basketToken && !!userAddr },
  })

  // Read basket total supply
  const { data: basketSupply } = useReadContract({
    address: basketToken,
    abi: ABIS.IndexToken,
    functionName: 'totalSupply',
    query: { enabled: !!basketToken },
  })

  // Read player names for components
  const playerInfoCalls = (components || []).map(pid => ({
    address: ADDRESSES.PlayerMarket,
    abi: ABIS.PlayerMarket,
    functionName: 'players',
    args: [pid],
  }))

  const { data: playerInfoResults } = useReadContracts({
    contracts: playerInfoCalls,
    query: { enabled: (components || []).length > 0 },
  })

  // ── MINT / REDEEM state ────────────────────────────────
  const [tab, setTab] = useState('mint')
  const [units, setUnits] = useState('')
  const [txHash, setTxHash] = useState(null)

  const { writeContract, isPending } = useWriteContract()
  const { isLoading: isTxLoading, isSuccess: isTxDone } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isTxDone) {
      setUnits('')
      setTxHash(null)
      refetchIndex()
      refetchNav()
      refetchComp()
      refetchBal()
    }
  }, [isTxDone])

  const unitsNum = Number(units) || 0

  function handleApproveAndMint() {
    if (!unitsNum || !vaultAddr) return
    const maxTotal = parseUnits(String(unitsNum * 2), 18) // 2x budget as slippage
    // First approve USDT
    writeContract({
      address: ADDRESSES.MockUSDT,
      abi: ABIS.MockUSDT,
      functionName: 'approve',
      args: [vaultAddr, maxTotal],
    }, {
      onSuccess(hash) {
        // Then mint
        writeContract({
          address: vaultAddr,
          abi: ABIS.IndexVault,
          functionName: 'mint',
          args: [indexId, BigInt(unitsNum), maxTotal],
        }, {
          onSuccess(hash2) { setTxHash(hash2) },
        })
      },
    })
  }

  function handleRedeem() {
    if (!unitsNum || !vaultAddr) return
    writeContract({
      address: vaultAddr,
      abi: ABIS.IndexVault,
      functionName: 'redeem',
      args: [indexId, BigInt(unitsNum), 0n],
    }, {
      onSuccess(hash) { setTxHash(hash) },
    })
  }

  if (!vaultAddr) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">IndexVault not deployed. Set <code>NEXT_PUBLIC_INDEX_VAULT</code> to enable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/indices" className="text-gray-400 hover:text-white transition-colors">&larr; Indices</Link>
        {kind !== undefined && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${KIND_COLORS[kind] || KIND_COLORS[4]}`}>
            {KIND_LABELS[kind] || 'Custom'}
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold text-white">{name || `Index #${params.id}`}</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-4">
          <div className="text-xs text-gray-400">NAV / Unit</div>
          <div className="text-lg font-bold text-white mt-1">{fmt(navValue)} mUSDT</div>
        </div>
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-4">
          <div className="text-xs text-gray-400">Total Supply</div>
          <div className="text-lg font-bold text-white mt-1">{fmt(basketSupply)} units</div>
        </div>
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-4">
          <div className="text-xs text-gray-400">Components</div>
          <div className="text-lg font-bold text-white mt-1">{components?.length || 0}</div>
        </div>
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-4">
          <div className="text-xs text-gray-400">Your Balance</div>
          <div className="text-lg font-bold text-white mt-1">{userBasketBal ? fmt(userBasketBal) : '0'} units</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component weight table */}
        <div className="lg:col-span-2 bg-surface-100 border border-surface-300 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Component Weights</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-surface-300">
                  <th className="text-left py-2 pr-4">Player ID</th>
                  <th className="text-left py-2 pr-4">Weight</th>
                  <th className="text-right py-2 pr-4">Value (mUSDT)</th>
                  <th className="text-right py-2">Holdings</th>
                </tr>
              </thead>
              <tbody>
                {(components || []).map((pid, i) => {
                  const weight = weightBps?.[i] ? Number(weightBps[i]) / 100 : 0
                  const value = compValues?.[1]?.[i]
                  const balance = compValues?.[2]?.[i]
                  return (
                    <tr key={i} className="border-b border-surface-300/50 hover:bg-surface-200/30">
                      <td className="py-3 pr-4">
                        <Link href={`/player/${pid}`} className="text-green-400 hover:underline">
                          Player #{pid.toString()}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-surface-300 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${weight}%` }}
                            />
                          </div>
                          <span className="text-white">{weight.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right text-white">{fmt(value)}</td>
                      <td className="py-3 text-right text-gray-400">{fmt(balance, 4)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mint / Redeem panel */}
        <div className="bg-surface-100 border border-surface-300 rounded-xl p-5">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab('mint')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'mint' ? 'bg-green-600 text-white' : 'bg-surface-300 text-gray-400'
              }`}
            >
              Mint (Buy)
            </button>
            <button
              onClick={() => setTab('redeem')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'redeem' ? 'bg-red-600 text-white' : 'bg-surface-300 text-gray-400'
              }`}
            >
              Redeem (Sell)
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Units ({tab === 'mint' ? '1 unit ≈ 1 mUSDT notional' : 'basket tokens to burn'})
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 100"
                value={units}
                onChange={e => setUnits(e.target.value)}
                className="w-full bg-surface-200 border border-surface-300 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500"
              />
            </div>

            {tab === 'mint' && (
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Est. cost</span>
                  <span className="text-white">~{unitsNum} mUSDT</span>
                </div>
                <div className="flex justify-between">
                  <span>Basket tokens</span>
                  <span className="text-white">{unitsNum}</span>
                </div>
              </div>
            )}

            {tab === 'redeem' && (
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Your balance</span>
                  <span className="text-white">{userBasketBal ? fmt(userBasketBal) : '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>NAV est.</span>
                  <span className="text-white">
                    {navValue ? fmt(BigInt(unitsNum) * navValue) : '—'} mUSDT
                  </span>
                </div>
              </div>
            )}

            {!isConnected ? (
              <div className="text-center text-gray-500 text-sm py-3">Connect wallet to trade</div>
            ) : (
              <button
                disabled={!unitsNum || isPending || isTxLoading || !active}
                onClick={tab === 'mint' ? handleApproveAndMint : handleRedeem}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  tab === 'mint' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isPending || isTxLoading
                  ? 'Processing...'
                  : !active
                    ? 'Index Inactive'
                    : tab === 'mint'
                      ? `Mint ${unitsNum} Units`
                      : `Redeem ${unitsNum} Units`
                }
              </button>
            )}

            {txHash && (
              <div className="text-xs text-green-400 truncate">
                Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
