'use client'

/* SwapPanel: AMM swap interface for graduated player tokens */
import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ABIS } from '@/lib/contracts'
import { formatUSDT } from '@/lib/utils'

export default function SwapPanel({ ammAddress, tokenAddress }) {
  const [tab, setTab] = useState('buy') // buy = USDT→Token, sell = Token→USDT
  const [amount, setAmount] = useState('')
  const { address, isConnected } = useAccount()

  const amountWei = amount ? BigInt(Math.floor(Number(amount) * 1e18).toString()) : BigInt(0)

  // Read AMM reserves
  const { data: reserveUsdt } = useReadContract({
    address: ammAddress,
    abi: ABIS.PlayerAMM,
    functionName: 'reserveUsdt',
  })

  const { data: reserveToken } = useReadContract({
    address: ammAddress,
    abi: ABIS.PlayerAMM,
    functionName: 'reserveToken',
  })

  const { data: ammPrice } = useReadContract({
    address: ammAddress,
    abi: ABIS.PlayerAMM,
    functionName: 'price',
  })

  // Read USDT allowance for AMM
  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: process.env.NEXT_PUBLIC_MOCK_USDT,
    abi: ABIS.MockUSDT,
    functionName: 'allowance',
    args: [address, ammAddress],
    query: { enabled: !!address && !!ammAddress },
  })

  // Read token allowance for AMM
  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: tokenAddress,
    abi: ABIS.PlayerToken,
    functionName: 'allowance',
    args: [address, ammAddress],
    query: { enabled: !!address && !!ammAddress },
  })

  // Read balances
  const { data: usdtBalance } = useReadContract({
    address: process.env.NEXT_PUBLIC_MOCK_USDT,
    abi: ABIS.MockUSDT,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address },
  })

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ABIS.PlayerToken,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address && !!tokenAddress },
  })

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) {
      setAmount('')
      refetchUsdtAllowance()
      refetchTokenAllowance()
      reset()
    }
  }, [isSuccess, refetchUsdtAllowance, refetchTokenAllowance, reset])

  // Estimate output (simple constant product)
  let estimatedOut = BigInt(0)
  if (amountWei > 0n && reserveUsdt && reserveToken) {
    if (tab === 'buy') {
      // USDT in → Token out
      const fee = (amountWei * 100n) / 10000n // 1%
      const afterFee = amountWei - fee
      estimatedOut = (reserveToken * afterFee) / (reserveUsdt + afterFee)
    } else {
      // Token in → USDT out
      const grossOut = (reserveUsdt * amountWei) / (reserveToken + amountWei)
      const fee = (grossOut * 100n) / 10000n
      estimatedOut = grossOut - fee
    }
  }

  const needsApproval = tab === 'buy'
    ? amountWei > 0n && (usdtAllowance || 0n) < amountWei
    : amountWei > 0n && (tokenAllowance || 0n) < amountWei

  function handleApprove() {
    const tokenAddr = tab === 'buy' ? process.env.NEXT_PUBLIC_MOCK_USDT : tokenAddress
    writeContract({
      address: tokenAddr,
      abi: ABIS.MockUSDT,
      functionName: 'approve',
      args: [ammAddress, amountWei * 2n],
    })
  }

  function handleSwap() {
    if (amountWei <= 0n) return
    const minOut = (estimatedOut * 95n) / 100n // 5% slippage

    if (tab === 'buy') {
      writeContract({
        address: ammAddress,
        abi: ABIS.PlayerAMM,
        functionName: 'swapUsdtForShares',
        args: [amountWei, minOut],
      })
    } else {
      writeContract({
        address: ammAddress,
        abi: ABIS.PlayerAMM,
        functionName: 'swapSharesForUsdt',
        args: [amountWei, minOut],
      })
    }
  }

  const busy = isPending || isConfirming

  return (
    <div className="bg-surface-200 border border-surface-300 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">AMM Swap</h3>
        <span className="text-xs text-accent-gold bg-accent-gold/10 px-2 py-1 rounded">Graduated</span>
      </div>

      {/* Price */}
      {ammPrice && (
        <div className="mb-4 text-sm text-gray-400">
          AMM Price: <span className="text-white font-medium">{formatUSDT(ammPrice)} mUSDT</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-surface rounded-lg p-1 mb-4">
        <button
          onClick={() => { setTab('buy'); setAmount(''); reset() }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'buy' ? 'bg-accent-green/20 text-accent-green' : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy Token
        </button>
        <button
          onClick={() => { setTab('sell'); setAmount(''); reset() }}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'sell' ? 'bg-accent-red/20 text-accent-red' : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell Token
        </button>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">
          {tab === 'buy' ? 'mUSDT Amount' : 'Token Amount'}
        </label>
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-surface border border-surface-300 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-accent-green/50 transition-colors"
        />
        {/* Balance */}
        <div className="text-xs text-gray-500 mt-1 text-right">
          Balance: {tab === 'buy' ? formatUSDT(usdtBalance || 0n) : formatUSDT(tokenBalance || 0n)}
        </div>
      </div>

      {/* Estimate */}
      {amountWei > 0n && (
        <div className="bg-surface rounded-lg p-3 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Estimated Output</span>
            <span className="text-white font-medium">
              {formatUSDT(estimatedOut)} {tab === 'buy' ? 'Tokens' : 'mUSDT'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Swap Fee</span>
            <span className="text-gray-300">1%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Slippage Tolerance</span>
            <span className="text-gray-300">5%</span>
          </div>
        </div>
      )}

      {/* Action */}
      {!isConnected ? (
        <p className="text-center text-gray-500 text-sm py-3">Connect wallet to swap</p>
      ) : needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={busy}
          className="w-full py-3 rounded-lg font-semibold text-sm bg-accent-blue hover:bg-accent-blue/80 text-white transition-colors disabled:opacity-50"
        >
          {busy ? 'Approving...' : `Approve ${tab === 'buy' ? 'mUSDT' : 'Token'}`}
        </button>
      ) : (
        <button
          onClick={handleSwap}
          disabled={busy || amountWei <= 0n}
          className={`w-full py-3 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50 ${
            tab === 'buy'
              ? 'bg-accent-green hover:bg-accent-green/80'
              : 'bg-accent-red hover:bg-accent-red/80'
          }`}
        >
          {busy ? 'Swapping...' : `Swap ${tab === 'buy' ? 'mUSDT for Token' : 'Token for mUSDT'}`}
        </button>
      )}

      {isSuccess && (
        <p className="text-accent-green text-sm text-center mt-3">Swap confirmed!</p>
      )}
    </div>
  )
}
