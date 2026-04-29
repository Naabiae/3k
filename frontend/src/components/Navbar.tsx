import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Wallet, AlertTriangle, Menu, X, Send, History, Settings, User } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { address, connect, isConnecting, isCorrectNetwork, switchNetwork } = useWallet()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: User },
    { to: '/send', label: 'Send', icon: Send },
    { to: '/receipts', label: 'Receipts', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-ink-800/50 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-flare-500 to-flare-600 font-display text-lg font-bold text-white shadow-lg">
                <User className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-semibold text-white">QIE Pay</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-ink-800 text-white'
                        : 'text-ink-400 hover:text-white hover:bg-ink-800/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {address && !isCorrectNetwork && (
              <button
                onClick={switchNetwork}
                className="hidden sm:flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Wrong Network
              </button>
            )}

            {address ? (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-ink-500">{formatAddress(address)}</span>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-flare-500/20 to-flare-600/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                </div>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="flex items-center gap-2 rounded-lg bg-flare-500 px-4 py-2 text-sm font-medium text-white hover:bg-flare-600 transition-colors disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-ink-300 hover:bg-ink-800 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-ink-800/50 bg-ink-950/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-ink-800 text-white'
                      : 'text-ink-400 hover:text-white hover:bg-ink-800/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
