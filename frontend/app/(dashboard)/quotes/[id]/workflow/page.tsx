'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Quote } from '@/types/quotes'
import { ApprovalWorkflow } from '@/types/workflows'
import { api } from '@/lib/api'
import WorkflowProgress from '@/components/workflows/WorkflowProgress'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function QuoteWorkflowPage() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch quote details
        const quoteResponse = await api.get(`/api/quotes/${params.id}`)
        setQuote(quoteResponse)
        
        // Fetch workflow if it exists
        if (quoteResponse.workflow_id) {
          const workflowResponse = await api.get(`/api/workflows/${quoteResponse.workflow_id}`)
          setWorkflow(workflowResponse)
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setError('Failed to load workflow details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchData()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading workflow details..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorMessage error={error} />
        <div className="mt-4">
          <Button onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorMessage error="Quote not found" />
        <div className="mt-4">
          <Link href="/quotes">
            <Button>Back to Quotes</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Details</h1>
          <p className="text-gray-600 mt-1">
            Quote: {quote.title} - {quote.customer_name}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/quotes/${quote.id}/edit`}>
            <Button variant="outline">
              Edit Quote
            </Button>
          </Link>
          <Link href={`/quotes/${quote.id}`}>
            <Button>
              Back to Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Quote Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Customer</label>
            <p className="text-gray-900">{quote.customer_name}</p>
            {quote.customer_email && (
              <p className="text-sm text-gray-600">{quote.customer_email}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Total Amount</label>
            <p className="text-xl font-bold text-gray-900">
              ${quote.total_amount.toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${
              quote.status === 'approved' ? 'bg-green-100 text-green-800' :
              quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Details */}
      {workflow ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Workflow</h2>
          <WorkflowProgress 
            workflow={workflow} 
            showDetails={true}
            compact={false}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Assigned</h3>
            <p className="text-gray-600 mb-4">
              This quote doesn't have an approval workflow assigned yet.
            </p>
            <Link href={`/quotes/${quote.id}/edit`}>
              <Button>
                Edit Quote to Add Workflow
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}