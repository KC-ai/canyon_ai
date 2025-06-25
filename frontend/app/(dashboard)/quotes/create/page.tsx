import Link from 'next/link'
import { QuoteCreationWizard } from '@/components/quotes/QuoteCreationWizard'

export default function CreateQuotePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Quote</h1>
          <p className="text-gray-600">Configure your quote details, items, and approval workflow</p>
        </div>
        <Link 
          href="/quotes"
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Quotes
        </Link>
      </div>

      <QuoteCreationWizard />
    </div>
  )
}