'use client'

/* LPPanel: Add/Remove liquidity for graduated player AMM pools */
import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ABIS } from '@/lib/contracts'
import { formatUSDT } from '@/lib/utils'

export default function LPPanel({ ammAddress, tokenAddress }) {
  const [tab, setTab] = useState('add')
  const [amount, setAmount] = useState('')
  const { address, isConnected } = useAccount()

  const amountWei = amount ? BigInt(Math.floor(Number(amount) * 1e18).toString()) : BigInt(0)

  // Read AMM state
  const { data: reserveUsdt } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'reserveUsdt',
  })
  const { data: reserveToken } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'reserveToken',
  })
  const { data: totalSupply } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'totalSupply',
  })
  const { data: lpBalance, refetch: refetchLp } = useReadContract({
    address: ammAddress, abi: ABIS.PlayerAMM, functionName: 'balanceOf',
    args: [address], query: { enabled: !!address },
  })

  // Allowances
  const { data: usdtAllowance, refetch: refetchUA } = useReadContract({
    address: process.env.NEXT_PUBLIC_MOCK_USDT, abi: ABIS.MockUSDT,
    functionName: 'allowance', args: [address, ammAddress],
    query: { enabled: !!address && !!ammAddress },
  })
  const { data: tokenAllowance, refetch: refetchTA } = useReadContract({
    address: tokenAddress, abi: ABIS.PlayerToken,
    functionName: 'allowance', args: [address, ammAddress],
    query: { enabled: !!address && !!ammAddress },
  })

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) {
      setAmount('')
      refetchLp()
      refetchUA()
      refetchTA()
      reset()
    }
  }, [isSuccess, refetchLp, refetchUA, refetchTA, reset])

  // Calculate proportional token amount for addLiquidity
  let requiredToken = BigInt(0)
  let expectedLp = BigInt(0)
  let removeUsdt = BigInt(0)
  let removeToken = BigInt(0)

  if (amountWei > 0n && reserveUsdt && reserveToken && totalSupply) {
    if (tab === 'add') {
      requiredToken = (amountWei * reserveToken) / reserveUsdt
      expectedLp = (amountWei * totalSupply) / reserveUsdt
    } else {
      // removeLiquidity: amountWei is LP tokens
      removeUsdt = (amountWei * reserveUsdt) / totalSupply
      removeToken = (amountWei * reserveToken) / totalSupply
    }
  }

  const needsUsdtApproval = tab === 'add' && amountWei > 0n && (usdtAllowance || 0n) < amountWei
  const needsTokenApproval = tab === 'add' && requiredToken > 0n && (tokenAllowance || 0n) < requiredToken

  function handleApproveUsdt() {
    writeContract({
      address: process.env.NEXT_PUBLIC_MOCK_USDT, abi: ABIS.MockUSDT,
      functionName: 'approve', args: [ammAddress, amountWei * 2n],
    })
  }

  function handleApproveToken() {
    writeContract({
      address: tokenAddress, abi: ABIS.PlayerToken,
      functionName: 'approve', args: [ammAddress, requiredToken * 2n],
    })
  }

  function handleAddLiquidity() {
    if (amountWei <= 0n) return
    const minLp = (expectedLp * 95n) / 100n
    writeContract({
      address: ammAddress, abi: ABIS.PlayerAMM,
      functionName: 'addLiquidity', args: [amountWei, minLp],
    })
  }

  function handleRemoveLiquidity() {
    if (amountWei <= 0n) return
    const minU = (removeUsdt * 95n) / 100n
    const minT = (removeToken * 95n) / 100n
    writeContract({
      address: ammAddress, abi: ABIS.PlayerAMM,
      functionName: 'removeLiquidity', args: [amountWei, minU, minT],
    })
  }

  const busy = isPending || isConfirming

  return (
    <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Liquidity</h3>

      {/* LP balance */}
      {lpBalance != null && (
        <div className="mb-4 text-sm text-gray-400">
          Your LP: <span className="text-white font-medium">{formatUSDT(lpBalance)}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-surface rounded-lg p-1 mb-4">
        <button
          onClick={() => { setTab('add'); setAmount(''); reset() }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'add' ? 'bg-accent-blue/20 text-accent-blue' : 'text-gray-400 hover:text-white'
          }`}
        >
          Add LP
        </button>
        <button
          onClick={() => { setTab('remove'); setAmount(''); reset() }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'remove' ? 'bg-accent-red/20 text-accent-red' : 'text-gray-400 hover:text-white'
          }`}
        >
          Remove LP
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">
          {tab === 'add' ? 'mUSDT Amount' : 'LP Token Amount'}
        </label>
        <input
          type="number" min="0" step="any" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-surface border border-surface-300 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-accent-blue/50 transition-colors"
        />
      </div>

      {/* Details */}
      {amountWei > 0n && (
        <div className="bg-surface rounded-lg p-3 mb-4 space-y-2 text-sm">
          {tab === 'add' ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Token Required</span>
                <span className="text-white">{formatUSDT(requiredToken)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">LP Tokens Received</span>
                <span className="text-accent-blue font-medium">{formatUSDT(expectedLp)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">mUSDT Received</span>
                <span className="text-white">{formatUSDT(removeUsdt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token Received</span>
                <span className="text-white">{formatUSDT(removeToken)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      {!isConnected ? (
        <p className="text-center text-gray-500 text-sm py-3">Connect wallet</p>
      ) : tab === 'add' ? (
        needsUsdtApproval ? (
          <button onClick={handleApproveUsdt} disabled={busy}
            className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-blue hover:bg-accent-blue/80 text-white disabled:opacity-50">
            {busy ? 'Approving...' : 'Approve mUSDT'}
          </button>
        ) : needsTokenApproval ? (
          <button onClick={handleApproveToken} disabled={busy}
            className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-blue hover:bg-accent-blue/80 text-white disabled:opacity-50">
            {busy ? 'Approving...' : 'Approve Token'}
          </button>
        ) : (
          <button onClick={handleAddLiquidity} disabled={busy || amountWei <= 0n}
            className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-blue hover:bg-accent-blue/80 text-white disabled:opacity-50">
            {busy ? 'Adding...' : 'Add Liquidity'}
          </button>
        )
      ) : (
        <button onClick={handleRemoveLiquidity} disabled={busy || amountWei <= 0n}
          className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-red hover:bg-accent-red/80 text-white disabled:opacity-50">
          {busy ? 'Removing...' : 'Remove Liquidity'}
        </button>
      )}

      {isSuccess && (
        <p className="text-accent-green text-sm text-center mt-3">Transaction confirmed!</p>
      )}
    </div>
  )
}
