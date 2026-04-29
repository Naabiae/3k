import { useState } from 'react'
import { Zap, TrendingUp, Lock, QrCode, Send, CheckCircle } from 'lucide-react'

interface BalanceCardProps {
  type: 'operating' | 'vault' | 'locked'
  amount: number
  token: string
  onInvest?: (amount: number) => void
  onSend?: () => void
  onReceive?: () => void
}

const typeConfig = {
  operating: {
    title: 'Operating',
    subtitle: 'Liquid Capital',
    icon: Zap,
    color: 'green',
    description: 'Available for immediate payments'
  },
  vault: {
    title: 'Yield Treasury',
    subtitle: 'Earning Yield',
    icon: TrendingUp,
    color: 'blue',
    description: 'Generating yield in vault'
  },
  locked: {
    title: 'Locked Savings',
    subtitle: 'Time-Locked',
    icon: Lock,
    color: 'flare',
    description: 'Periodic allowance releases'
  }
}

export default function BalanceCard({ 
  type, 
  amount, 
  token = 'USDC',
  onInvest, 
  onSend, 
  onReceive 
}: BalanceCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon
  const [showInvestInput, setShowInvestInput] = useState(false)
  const [investAmount, setInvestAmount] = useState('')
  const [isInvesting, setIsInvesting] = useState(false)

  const handleInvest = async () => {
    const parsed = parseFloat(investAmount)
    if (isNaN(parsed) || parsed <= 0) return
    
    setIsInvesting(true)
    try {
      await onInvest?.(parsed)
      setShowInvestInput(false)
      setInvestAmount('')
    } finally {
      setIsInvesting(false)
    }
  }

  return (
    <div className="rounded-2xl bg-ink-900/50 ring-1 ring-ink-800 p-6 hover:ring-ink-700 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-${config.color}-500/10 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 text-${config.color}-400`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{config.title}</h3>
            <p className="text-sm text-ink-500">{config.subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-white">
            {amount.toLocaleString()} <span className="text-sm font-medium text-ink-400">{token}</span>
          </p>
          <p className="text-xs text-ink-500">{config.description}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        {type === 'operating' && onSend && (
          <button
            onClick={onSend}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-flare-500/10 px-3 py-2 text-flare-400 hover:bg-flare-500/20 transition-colors text-sm font-medium"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        )}
        {onReceive && (
          <button
            onClick={onReceive}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-ink-400 hover:bg-ink-700 transition-colors text-sm font-medium"
          >
            <QrCode className="h-4 w-4" />
            QR
          </button>
        )}
        {type === 'operating' && onInvest && (
          <button
            onClick={() => setShowInvestInput(!showInvestInput)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-medium"
          >
            <TrendingUp className="h-4 w-4" />
            Invest
          </button>
        )}
      </div>

      {/* Invest Input (slide down) */}
      {showInvestInput && (
        <div className="mt-4 pt-4 border-t border-ink-800">
          <label className="block text-sm text-ink-400 mb-2">Amount to invest in vault</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={investAmount}
              onChange={(e) => setInvestAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg bg-ink-800 px-3 py-2 text-white placeholder-ink-500 ring-1 ring-ink-700 focus:outline-none focus:ring-flare-500"
            />
            <button
              onClick={handleInvest}
              disabled={isInvesting || !investAmount}
              className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isInvesting ? (
                <CheckCircle className="h-4 w-4 animate-pulse" />
              ) : (
                'Confirm'
              )}
            </button>
          </div>
          <p className="text-xs text-ink-500 mt-2">
            Funds will be deposited into the yield-generating vault
          </p>
        </div>
      )}
    </div>
  )
}
