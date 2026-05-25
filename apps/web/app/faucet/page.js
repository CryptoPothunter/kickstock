'use client'

import { useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ADDRESSES, ABIS } from '@/lib/contracts'
import { formatUSDT } from '@/lib/utils'

export default function FaucetPage() {
  const { address, isConnected } = useAccount()

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: ADDRESSES.MockUSDT,
    abi: ABIS.MockUSDT,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address },
  })

  const { data: faucetAmount } = useReadContract({
    address: ADDRESSES.MockUSDT,
    abi: ABIS.MockUSDT,
    functionName: 'faucetAmount',
  })

  const { data: cooldown } = useReadContract({
    address: ADDRESSES.MockUSDT,
    abi: ABIS.MockUSDT,
    functionName: 'faucetCooldown',
  })

  const { data: lastClaim } = useReadContract({
    address: ADDRESSES.MockUSDT,
    abi: ABIS.MockUSDT,
    functionName: 'lastFaucet',
    args: [address],
    query: { enabled: !!address },
  })

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) refetchBalance()
  }, [isSuccess, refetchBalance])

  const now = Math.floor(Date.now() / 1000)
  const lastClaimNum = lastClaim ? Number(lastClaim) : 0
  const cooldownNum = cooldown ? Number(cooldown) : 0
  const nextClaimAt = lastClaimNum + cooldownNum
  const canClaim = now >= nextClaimAt
  const cooldownRemaining = canClaim ? 0 : nextClaimAt - now

  function handleClaim() {
    writeContract({
      address: ADDRESSES.MockUSDT,
      abi: ABIS.MockUSDT,
      functionName: 'faucet',
    })
  }

  function formatCooldown(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-surface-200 border border-surface-300 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">mUSDT Faucet</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Claim free test mUSDT to start trading on KickStock
        </p>

        {/* Balance */}
        <div className="bg-surface rounded-xl p-6 text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Your mUSDT Balance</p>
          <p className="text-4xl font-bold text-white">
            {isConnected ? `$${formatUSDT(balance)}` : '--'}
          </p>
        </div>

        {/* Faucet info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500">Claim Amount</p>
            <p className="text-lg font-semibold text-accent-green">
              {faucetAmount ? formatUSDT(faucetAmount) : '1,000'} mUSDT
            </p>
          </div>
          <div className="bg-surface rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500">Cooldown</p>
            <p className="text-lg font-semibold text-white">
              {cooldownNum ? `${cooldownNum / 3600}h` : '--'}
            </p>
          </div>
        </div>

        {/* Cooldown status */}
        {isConnected && !canClaim && cooldownRemaining > 0 && (
          <div className="bg-accent-gold/10 border border-accent-gold/20 rounded-lg p-3 mb-4 text-center">
            <p className="text-accent-gold text-sm">
              Next claim in: <span className="font-mono font-semibold">{formatCooldown(cooldownRemaining)}</span>
            </p>
          </div>
        )}

        {/* Claim button */}
        {!isConnected ? (
          <p className="text-center text-gray-500 text-sm py-4">Connect your wallet to claim</p>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming || !canClaim}
            className="w-full py-4 rounded-xl font-semibold text-lg bg-accent-green hover:bg-accent-green/80 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming
              ? 'Claiming...'
              : !canClaim
              ? 'Cooldown Active'
              : 'Claim 1,000 mUSDT'}
          </button>
        )}

        {isSuccess && (
          <p className="text-accent-green text-sm text-center mt-4 font-medium">
            mUSDT claimed successfully!
          </p>
        )}
      </div>
    </div>
  )
}
