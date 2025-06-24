'use client'

import Link from 'next/link'
import { QuoteStatus } from '@/types/quotes'
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes'
import { showToast } from '@/lib/toast'

export function QuoteList() {
  const { quotes, loading, error, loadQuotes } = useRealtimeQuotes()

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.APPROVED:
        return 'text-green-600 bg-green-100'
      case QuoteStatus.PENDING:
        return 'text-yellow-600 bg-yellow-100'
      case QuoteStatus.REJECTED:
        return 'text-red-600 bg-red-100'
      case QuoteStatus.EXPIRED:
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-blue-600 bg-blue-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading quotes...</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Taking too long? Click to refresh
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={() => {
            loadQuotes().catch(err => showToast.error(err))
          }}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No quotes found</p>
        <Link 
          href="/quotes/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
        >
          Create Your First Quote
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {quotes.map((quote) => (
        <Link 
          key={quote.id} 
          href={`/quotes/${quote.id}`}
          className={`block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 ${
            quote.id.startsWith('temp-') ? 'opacity-60 border-2 border-dashed border-blue-300' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{quote.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 mb-1">{quote.customer_name}</p>
              <p className="text-sm text-gray-500">
                {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(quote.total_amount)}
              </p>
              <p className="text-sm text-gray-500">
                Created {new Date(quote.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}