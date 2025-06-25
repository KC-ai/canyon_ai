'use client'

import Link from 'next/link'
import { QuoteList } from '@/components/quotes/QuoteList'

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600">Manage your quotes and proposals</p>
        </div>
        <Link 
          href="/quotes/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
        >
          New Quote
        </Link>
      </div>
      
      <QuoteList />
    </div>
  )
}