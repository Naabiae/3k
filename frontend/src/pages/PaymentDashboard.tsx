import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import Navbar from '../components/Navbar'
import BalanceCard from '../components/BalanceCard'
import SendPaymentModal from '../components/SendPaymentModal'
import ReceiptsPage from '../components/ReceiptsPage'
import SettingsPage from '../components/SettingsPage'
import {
  Wallet,
  Send,
  History,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  QrCode,
  CheckCircle,
  Users,
  Copy,
  TrendingUp,
  Lock,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default function PaymentDashboard() {
  const navigate = useNavigate()
  const { address, connect, isCorrectNetwork, switchNetwork, disconnect } = useWallet()
  
  // Active page state
  const [activePage, setActivePage] = useState<'dashboard' | 'send' | 'receipts' | 'settings'>('dashboard')
  
  // Modals
  const [showSendModal, setShowSendModal] = useState(false)
  
  // Balance state
  const [balances, setBalances] = useState({
    operating: 1250.50,
    vault: 3580.75,
    locked: 850.00
  })
  
  // QR state
  const [showQR, setShowQR] = useState(false)
  const [qrValue, setQrValue] = useState('')
  
  // Network check
  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-ink-950">
        <Navbar />
        <div className="pt-32 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-4">
            Wrong Network
          </h1>
          <p className="text-ink-400 mb-8 max-w-md">
            Please switch to QIE Network to use QIE Pay
          </p>
          <button
            onClick={switchNetwork}
            className="inline-flex items-center gap-2 rounded-xl bg-flare-500 px-6 py-3 font-semibold text-white hover:bg-flare-600 transition-all"
          >
            Switch to QIE Network
          </button>
        </div>
      </div>
    )
  }

  // Wallet not connected
  if (!address) {
    return (
      <div className="min-h-screen bg-ink-950">
        <Navbar />
        <div className="pt-32 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-flare-500/10 flex items-center justify-center mx-auto mb-6">
              <Wallet className="h-10 w-10 text-flare-400" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-4">
              Welcome to QIE Pay
            </h1>
            <p className="text-ink-400 mb-8 max-w-md mx-auto">
              Send and receive payments with web3 speed. Connect your wallet to get started.
            </p>
            <button
              onClick={connect}
              className="inline-flex items-center gap-2 rounded-xl bg-flare-500 px-8 py-4 font-semibold text-white hover:bg-flare-600 transition-all text-lg"
            >
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </button>
            <p className="text-ink-600 text-sm mt-4">
              No fees. Instant settlements.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render active page
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BalanceCard
                type="operating"
                amount={balances.operating}
                token="USDC"
                onSend={() => setShowSendModal(true)}
                onReceive={() => {
                  setQrValue(address)
                  setShowQR(true)
                }}
                onInvest={(amount) => {
                  // Stub: Call contract invest function
                  console.log('Invest', amount)
                  setBalances(prev => ({
                    ...prev,
                    operating: prev.operating - amount,
                    vault: prev.vault + amount
                  }))
                }}
              />
              <BalanceCard
                type="vault"
                amount={balances.vault}
                token="USDC"
                onReceive={() => {
                  setQrValue(address)
                  setShowQR(true)
                }}
              />
              <BalanceCard
                type="locked"
                amount={balances.locked}
                token="USDC"
                onReceive={() => {
                  setQrValue(address)
                  setShowQR(true)
                }}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowSendModal(true)}
                className="rounded-2xl bg-flare-500/10 p-6 ring-1 ring-flare-500/20 hover:bg-flare-500/20 hover:ring-flare-500/40 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-flare-500/20 flex items-center justify-center mb-3 group-hover:bg-flare-500/30 transition-colors">
                  <Send className="h-5 w-5 text-flare-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">Send Payment</h3>
                <p className="text-sm text-ink-400">Send USDC to anyone with email or wallet</p>
              </button>
              <button
                onClick={() => {
                  setQrValue(address)
                  setShowQR(true)
                }}
                className="rounded-2xl bg-ink-800/50 p-6 ring-1 ring-ink-700 hover:bg-ink-700/50 hover:ring-ink-600 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-ink-700/50 flex items-center justify-center mb-3 group-hover:bg-ink-600/50 transition-colors">
                  <QrCode className="h-5 w-5 text-ink-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">Receive Payment</h3>
                <p className="text-sm text-ink-400">Generate QR code for your address</p>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl bg-ink-900/50 ring-1 ring-ink-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-ink-400" />
                  Recent Activity
                </h3>
                <button
                  onClick={() => setActivePage('receipts')}
                  className="text-sm text-flare-400 hover:text-flare-300 transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/50">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      {i % 2 === 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {i % 2 === 0 ? 'Payment sent to alice@qie.com' : 'Payment received from bob@qie.com'}
                      </p>
                      <p className="text-xs text-ink-500">2 hours ago</p>
                    </div>
                    <p className={`text-sm font-medium ${
                      i % 2 === 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {i % 2 === 0 ? '-' : '+'}${(Math.random() * 200 + 10).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'receipts':
        return <ReceiptsPage />

      case 'settings':
        return <SettingsPage />

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />

      {/* Main Content */}
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {renderContent()}
        </div>
      </div>

      {/* Send Payment Modal */}
      <SendPaymentModal
        isOpen={showSendModal || activePage === 'send'}
        onClose={() => {
          setShowSendModal(false)
          setActivePage('dashboard')
        }}
        onSend={async (data) => {
          // Stub: Send payment logic
          console.log('Sending payment:', data)
          setBalances(prev => ({
            ...prev,
            operating: prev.operating - data.amount
          }))
        }}
      />

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="relative rounded-2xl bg-ink-900 p-6 ring-1 ring-ink-800 max-w-sm w-full">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-1 text-ink-500 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <h3 className="font-semibold text-white mb-4">Your Address</h3>
              <div className="bg-white p-4 rounded-lg flex justify-center mb-4">
                <QrCode size={180} values={qrValue} letterSpacing={4} />
              </div>
              <div className="flex items-center gap-2 bg-ink-800 rounded-lg p-3 mb-4">
                <code className="text-xs text-ink-300 break-all flex-1">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(address || '')}
                  className="p-1 text-ink-500 hover:text-white transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setShowQR(false)}
                className="w-full rounded-xl bg-flare-500 px-6 py-3 font-semibold text-white hover:bg-flare-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-ink-950/95 backdrop-blur-sm border-t border-ink-800 lg:hidden">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`flex flex-col items-center gap-1 py-2 px-4 ${activePage === 'dashboard' ? 'text-flare-400' : 'text-ink-500 hover:text-white'}`}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className={`flex flex-col items-center gap-1 py-2 px-4 text-ink-500 hover:text-white`}
          >
            <Send className="h-5 w-5" />
            <span className="text-xs">Send</span>
          </button>
          <button
            onClick={() => setActivePage('receipts')}
            className={`flex flex-col items-center gap-1 py-2 px-4 ${activePage === 'receipts' ? 'text-flare-400' : 'text-ink-500 hover:text-white'}`}
          >
            <History className="h-5 w-5" />
            <span className="text-xs">Receipts</span>
          </button>
          <button
            onClick={() => setActivePage('settings')}
            className={`flex flex-col items-center gap-1 py-2 px-4 ${activePage === 'settings' ? 'text-flare-400' : 'text-ink-500 hover:text-white'}`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
