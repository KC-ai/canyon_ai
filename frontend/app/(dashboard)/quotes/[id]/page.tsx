'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Quote } from '@/types/quotes'
import { quotesApi } from '@/lib/quotes'
import { showToast } from '@/lib/toast'

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.id as string
  
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true)
        const fetchedQuote = await quotesApi.getQuote(quoteId)
        setQuote(fetchedQuote)
        setError('')
      } catch (err) {
        setError('Failed to load quote')
        console.error('Error fetching quote:', err)
      } finally {
        setLoading(false)
      }
    }

    if (quoteId) {
      fetchQuote()
    }
  }, [quoteId])

  const handleDelete = async () => {
    if (!quote || !confirm('Are you sure you want to delete this quote?')) return

    try {
      await quotesApi.deleteQuote(quote.id)
      showToast.success('Quote deleted successfully!')
      router.push('/quotes')
    } catch (err) {
      showToast.error(err as Error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error || 'Quote not found'}</p>
        <Link href="/quotes" className="mt-2 text-red-600 hover:text-red-800 underline">
          ← Back to Quotes
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
          <p className="text-gray-600">Quote details and management</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href={`/quotes/${quoteId}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Edit Quote
          </Link>
          <Link 
            href="/quotes"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Quotes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quote Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Customer</label>
              <p className="text-gray-900">{quote.customer_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{quote.customer_email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-gray-900">{quote.description || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Amount</label>
              <p className="text-2xl font-bold text-gray-900">${quote.total_amount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                quote.status === 'approved' ? 'bg-green-100 text-green-800' :
                quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900">{new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quote Items</h3>
          {quote.items && quote.items.length > 0 ? (
            <div className="space-y-3">
              {quote.items.map((item, index) => (
                <div key={index} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-600">{item.description}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No items in this quote</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Actions</h3>
          <div className="space-y-3">
            <Link
              href={`/quotes/${quoteId}/edit`}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 block text-center"
            >
              Edit Quote
            </Link>
            <button 
              onClick={handleDelete}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Delete Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}