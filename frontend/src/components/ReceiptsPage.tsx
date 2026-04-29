import { useState, useEffect } from 'react'
import { Copy, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Search, Filter, Download, History } from 'lucide-react'

interface PaymentReceipt {
  id: string
  senderEmail: string
  recipientEmail: string
  amount: number
  token: string
  status: 'pending' | 'confirmed' | 'completed' | 'failed'
  transactionHash?: string
  createdAt: string
  type: 'sent' | 'received'
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([])
  const [filteredReceipts, setFilteredReceipts] = useState<PaymentReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data for demo - in real app, fetch from /api/payments?email=...
  useEffect(() => {
    const mockData: PaymentReceipt[] = [
      {
        id: '1',
        senderEmail: 'your.email@example.com',
        recipientEmail: 'alice@qie.com',
        amount: 150.00,
        token: 'USDC',
        status: 'completed',
        transactionHash: '0x1234...abcd',
        createdAt: '2026-04-29T18:30:00Z',
        type: 'sent'
      },
      {
        id: '2',
        senderEmail: 'bob@qie.com',
        recipientEmail: 'your.email@example.com',
        amount: 75.50,
        token: 'USDC',
        status: 'completed',
        transactionHash: '0x5678...efgh',
        createdAt: '2026-04-29T16:45:00Z',
        type: 'received'
      },
      {
        id: '3',
        senderEmail: 'your.email@example.com',
        recipientEmail: 'charlie@qie.com',
        amount: 200.00,
        token: 'USDC',
        status: 'pending',
        createdAt: '2026-04-29T14:20:00Z',
        type: 'sent'
      },
      {
        id: '4',
        senderEmail: 'david@qie.com',
        recipientEmail: 'your.email@example.com',
        amount: 30.00,
        token: 'USDC',
        status: 'confirmed',
        transactionHash: '0x9abc...def0',
        createdAt: '2026-04-29T12:00:00Z',
        type: 'received'
      }
    ]

    setReceipts(mockData)
    setFilteredReceipts(mockData)
    setIsLoading(false)
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = receipts

    // Type filter
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.type === filter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(r =>
        r.senderEmail.toLowerCase().includes(term) ||
        r.recipientEmail.toLowerCase().includes(term) ||
        r.amount.toString().includes(term)
      )
    }

    setFilteredReceipts(filtered)
  }, [receipts, filter, statusFilter, searchTerm])

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-amber-400 bg-amber-500/10',
      confirmed: 'text-blue-400 bg-blue-500/10',
      completed: 'text-green-400 bg-green-500/10',
      failed: 'text-red-400 bg-red-500/10'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      default:
        return <XCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Payment Receipts</h1>
          <p className="text-ink-400">View and manage your payment history</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-ink-800 px-4 py-2 text-ink-400 hover:bg-ink-700 hover:text-white transition-colors">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-ink-900/50 p-4 ring-1 ring-ink-800">
        <div className="flex flex-wrap gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-500" />
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-flare-500 text-white'
                  : 'bg-ink-800 text-ink-400 hover:bg-ink-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === 'sent'
                  ? 'bg-flare-500 text-white'
                  : 'bg-ink-800 text-ink-400 hover:bg-ink-700'
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === 'received'
                  ? 'bg-flare-500 text-white'
                  : 'bg-ink-800 text-ink-400 hover:bg-ink-700'
              }`}
            >
              Received
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg bg-ink-800 px-3 py-1.5 text-sm text-white ring-1 ring-ink-700 focus:outline-none focus:ring-flare-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-ink-800 pl-10 pr-4 py-2 text-white text-sm placeholder-ink-500 ring-1 ring-ink-700 focus:outline-none focus:ring-flare-500"
            />
          </div>
        </div>
      </div>

      {/* Receipts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-flare-500/30 border-t-flare-500" />
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="rounded-2xl bg-ink-900/50 p-8 text-center ring-1 ring-ink-800">
          <History className="h-12 w-12 mx-auto text-ink-600 mb-4" />
          <p className="text-ink-400">No payments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="rounded-2xl bg-ink-900/50 p-4 ring-1 ring-ink-800 hover:ring-ink-700 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${
                    receipt.type === 'sent'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-green-500/10 text-green-400'
                  }`}>
                    {receipt.type === 'sent' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-ink-400">
                      {receipt.type === 'sent' ? 'Sent to' : 'Received from'}
                    </p>
                    <p className="font-medium text-white">
                      {receipt.type === 'sent' ? receipt.recipientEmail : receipt.senderEmail}
                    </p>
                    <p className="text-xs text-ink-500">{formatDate(receipt.createdAt)}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-display font-bold ${
                    receipt.type === 'sent' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {receipt.type === 'sent' ? '-' : '+'}{receipt.amount} {receipt.token}
                  </p>
                  <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs ${
                    getStatusColor(receipt.status)
                  }`}>
                    {getStatusIcon(receipt.status)}
                    <span className="capitalize">{receipt.status}</span>
                  </div>
                </div>
              </div>

              {receipt.transactionHash && (
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-ink-800">
                  <p className="text-xs text-ink-500">
                    Tx: {receipt.transactionHash.slice(0, 6)}...{receipt.transactionHash.slice(-4)}
                  </p>
                  <button
                    onClick={() => handleCopyHash(receipt.transactionHash!)}
                    className="flex items-center gap-1 text-xs text-ink-400 hover:text-white transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
