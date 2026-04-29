import { useMemo, useState } from 'react'
import { useWallet } from '../context/WalletContext'
import SendPaymentModal from '../components/SendPaymentModal'
import ReceiptsPage from '../components/ReceiptsPage'
import SettingsPage from '../components/SettingsPage'
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  HelpCircle,
  Home,
  Layers,
  PiggyBank,
  Search,
  Settings as SettingsIcon,
  User,
} from 'lucide-react'

type NavKey = 'dashboard' | 'payments' | 'deposits' | 'history' | 'account' | 'settings' | 'help' | 'receipts'

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 rounded-xl border border-ink-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-ink-500">{label}</div>
        <div className={`h-2 w-2 rounded-full ${color}`} />
      </div>
      <div className="mt-2 text-sm font-semibold text-ink-900">{value}</div>
    </div>
  )
}

function MiniBarChart({ series }: { series: Array<{ label: string; a: number; b: number }> }) {
  const max = useMemo(() => Math.max(...series.map((s) => Math.max(s.a, s.b)), 1), [series])
  return (
    <div className="mt-5">
      <div className="grid grid-cols-6 items-end gap-3">
        {series.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center gap-2">
              <div
                className="w-3 rounded-full bg-ink-200"
                style={{ height: `${Math.round((s.a / max) * 100)}%` }}
              />
              <div
                className="w-3 rounded-full bg-flare-500"
                style={{ height: `${Math.round((s.b / max) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-medium text-ink-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-ink-200" />
          Planned
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-flare-500" />
          Actual
        </div>
      </div>
    </div>
  )
}

export default function PaymentDashboard() {
  const { address, connect, isCorrectNetwork, switchNetwork } = useWallet()
  const [active, setActive] = useState<NavKey>('dashboard')
  const [showSendModal, setShowSendModal] = useState(false)

  const balance = useMemo(() => {
    const operating = 5124
    const treasury = 8145
    const locked = 5345
    return {
      operating,
      treasury,
      locked,
      total: operating + treasury + locked,
      lastPayment: 842,
      profit: 768.55,
      accountAgeDays: 342,
    }
  }, [])

  const chartSeries = useMemo(
    () => [
      { label: 'Oct', a: 18, b: 22 },
      { label: 'Nov', a: 23, b: 17 },
      { label: 'Dec', a: 14, b: 28 },
      { label: 'Jan', a: 21, b: 16 },
      { label: 'Feb', a: 12, b: 19 },
      { label: 'Mar', a: 15, b: 31 },
    ],
    [],
  )

  const plannings = useMemo(
    () => [
      { title: 'New Laptop M1', target: 900, progress: 0.45 },
      { title: 'Dream House', target: 120000, progress: 0.18 },
      { title: 'Emergency Fund', target: 5000, progress: 0.72 },
    ],
    [],
  )

  const transactions = useMemo(
    () => [
      { name: 'Payment', category: 'Router', date: '22 Jun, 2026 10:30', amount: -124.45 },
      { name: 'Deposit', category: 'Savings', date: '19 Jun, 2026 14:05', amount: 420.0 },
      { name: 'Allowance', category: 'Locked', date: '15 Jun, 2026 09:12', amount: -60.0 },
    ],
    [],
  )
  
  // Network check
  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-ink-950 px-4">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/25" />
          <h1 className="mt-6 font-display text-3xl font-bold text-white">Wrong Network</h1>
          <p className="mt-3 text-ink-300">Switch to QIE Network to continue.</p>
          <button
            onClick={switchNetwork}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-flare-500 px-6 py-3 text-sm font-semibold text-white hover:bg-flare-600"
          >
            Switch Network
          </button>
        </div>
      </div>
    )
  }

  // Wallet not connected
  if (!address) {
    return (
      <div className="min-h-screen bg-ink-950 px-4">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-flare-500 to-flare-600 shadow-halo">
            <User className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-white">QIE Pay</h1>
          <p className="mt-3 text-ink-300">Connect your wallet to open your dashboard.</p>
          <button
            onClick={connect}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-flare-500 px-6 py-3 text-sm font-semibold text-white hover:bg-flare-600"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  const nav = useMemo(
    () => [
      { key: 'dashboard' as const, label: 'Dashboard', icon: Home },
      { key: 'payments' as const, label: 'Payments', icon: CreditCard },
      { key: 'deposits' as const, label: 'Deposits', icon: PiggyBank },
      { key: 'receipts' as const, label: 'Receipts', icon: Layers },
      { key: 'settings' as const, label: 'Settings', icon: SettingsIcon },
      { key: 'help' as const, label: 'Help', icon: HelpCircle },
    ],
    [],
  )

  const content = (() => {
    if (active === 'settings') return <SettingsPage />
    if (active === 'receipts') return <ReceiptsPage />

    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-ink-900">Balance</div>
                <div className="mt-2 text-xs text-ink-500">Total balance</div>
              </div>
              <button className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50">
                Export
              </button>
            </div>

            <div className="mt-5">
              <div className="text-3xl font-semibold text-ink-900">{formatMoney(balance.total)} USD</div>
              <div className="mt-1 text-xs text-ink-500">Last payment: {formatMoney(balance.lastPayment)} USD</div>
            </div>

            <div className="mt-6 flex gap-3">
              <MetricPill label="Operating" value={`$${formatMoney(balance.operating)}`} color="bg-flare-500" />
              <MetricPill label="Treasury" value={`$${formatMoney(balance.treasury)}`} color="bg-emerald-500" />
              <MetricPill label="Locked" value={`$${formatMoney(balance.locked)}`} color="bg-indigo-500" />
            </div>

            <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-ink-600">Distribution</div>
                <div className="text-xs text-ink-500">{Math.round((balance.treasury / balance.total) * 100)}% earning yield</div>
              </div>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink-200">
                <div className="h-full bg-flare-500" style={{ width: `${(balance.operating / balance.total) * 100}%` }} />
                <div className="h-full bg-emerald-500" style={{ width: `${(balance.treasury / balance.total) * 100}%` }} />
                <div className="h-full bg-indigo-500" style={{ width: `${(balance.locked / balance.total) * 100}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-ink-600 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-flare-500" />
                  Operating
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Treasury
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Locked
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-ink-200 bg-white p-4">
                <div className="text-xs text-ink-500">Avg. monthly profit</div>
                <div className="mt-2 text-lg font-semibold text-ink-900">${formatMoney(balance.profit)}</div>
              </div>
              <div className="rounded-2xl border border-ink-200 bg-white p-4">
                <div className="text-xs text-ink-500">Account age</div>
                <div className="mt-2 text-lg font-semibold text-ink-900">{balance.accountAgeDays} days</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-ink-900">General Payment</div>
                <div className="mt-2 text-xs text-ink-500">Payment statistics</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-50 text-ink-600 ring-1 ring-ink-200">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5">
              <div className="text-3xl font-semibold text-ink-900">{formatMoney(40090423)} USD</div>
              <div className="mt-1 text-xs text-ink-500">Updated weekly</div>
            </div>

            <MiniBarChart series={chartSeries} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-900">Plannings</div>
              <button className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50">
                Add
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {plannings.map((p) => (
                <div key={p.title} className="rounded-2xl border border-ink-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-ink-900">{p.title}</div>
                      <div className="mt-1 text-xs text-ink-500">Target: ${formatMoney(p.target)}</div>
                    </div>
                    <div className="text-sm font-semibold text-ink-900">{Math.round(p.progress * 100)}%</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-flare-500" style={{ width: `${p.progress * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-900">Last Transaction</div>
              <button
                onClick={() => setShowSendModal(true)}
                className="rounded-xl bg-flare-500 px-3 py-2 text-xs font-semibold text-white hover:bg-flare-600"
              >
                New
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200">
              <div className="grid grid-cols-12 bg-ink-50 px-4 py-3 text-[11px] font-semibold text-ink-600">
                <div className="col-span-6">Name</div>
                <div className="col-span-4">Date</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              <div className="divide-y divide-ink-200 bg-white">
                {transactions.map((t) => (
                  <div key={`${t.name}-${t.date}`} className="grid grid-cols-12 items-center px-4 py-3">
                    <div className="col-span-6">
                      <div className="text-sm font-semibold text-ink-900">{t.name}</div>
                      <div className="text-xs text-ink-500">{t.category}</div>
                    </div>
                    <div className="col-span-4 text-xs text-ink-600">{t.date}</div>
                    <div className={`col-span-2 text-right text-sm font-semibold ${t.amount >= 0 ? 'text-emerald-600' : 'text-ink-900'}`}>
                      {t.amount >= 0 ? '+' : '-'}${formatMoney(Math.abs(t.amount))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  })()

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-ink-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-flare-500 to-flare-600 text-white shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink-900">QIE Pay</div>
              <div className="text-xs text-ink-500">Financiers</div>
            </div>
          </div>

          <div className="px-3">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">General</div>
            <div className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon
                const isActive = active === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                    {item.key === 'dashboard' && (
                      <span className="ml-auto rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                        2
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto px-6 py-6">
            <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
              <div className="text-xs font-semibold text-ink-700">Connected</div>
              <div className="mt-2 text-xs text-ink-600">{address.slice(0, 6)}...{address.slice(-4)}</div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-ink-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink-500">Dashboard</div>
                <div className="mt-1 text-lg font-semibold text-ink-900">Overview</div>
              </div>

              <div className="hidden flex-1 items-center justify-center lg:flex">
                <div className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-2">
                  <Search className="h-4 w-4 text-ink-500" />
                  <input
                    className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
                    placeholder="Search"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSendModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-flare-500 px-4 py-2 text-sm font-semibold text-white hover:bg-flare-600"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Send
                </button>
                <button
                  onClick={() => setActive('settings')}
                  className="inline-flex items-center justify-center rounded-2xl border border-ink-200 bg-white p-2 text-ink-700 hover:bg-ink-50"
                >
                  <SettingsIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            {content}
          </div>
        </main>
      </div>

      <SendPaymentModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={async () => {}}
      />
    </div>
  )
}
