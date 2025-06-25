'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { QuoteStatus } from '@/types/quotes'
import { ApprovalWorkflow, WorkflowActionRequest } from '@/types/workflows'
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes'
import { showToast } from '@/lib/toast'
import QuoteCard from './QuoteCard'

export function QuoteList() {
  const { quotes, loading, error, loadQuotes } = useRealtimeQuotes()
  const [workflows, setWorkflows] = useState<Record<string, ApprovalWorkflow>>({})
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)

  // Load workflows for quotes that have workflow_id
  useEffect(() => {
    const loadWorkflows = async () => {
      if (!quotes.length) return
      
      const quotesWithWorkflows = quotes.filter(quote => quote.workflow_id)
      if (!quotesWithWorkflows.length) return
      
      setLoadingWorkflows(true)
      try {
        const workflowPromises = quotesWithWorkflows.map(async (quote) => {
          if (!quote.workflow_id) return null
          
          try {
            const { workflowsApi } = await import('../../lib/api')
            const workflow = await workflowsApi.getWorkflow(quote.workflow_id)
            return { quoteId: quote.id, workflow }
          } catch (error) {
            console.warn(`Failed to load workflow ${quote.workflow_id}:`, error)
            return null
          }
        })
        
        const results = await Promise.all(workflowPromises)
        const newWorkflows: Record<string, ApprovalWorkflow> = {}
        
        results.forEach(result => {
          if (result?.workflow) {
            newWorkflows[result.quoteId] = result.workflow
          }
        })
        
        setWorkflows(newWorkflows)
      } catch (error) {
        console.error('Failed to load workflows:', error)
      } finally {
        setLoadingWorkflows(false)
      }
    }
    
    loadWorkflows()
  }, [quotes])
  
  // Handle workflow actions
  const handleWorkflowAction = async (workflowId: string, stepOrder: number, action: WorkflowActionRequest) => {
    try {
      const { workflowsApi } = await import('../../lib/api')
      const updatedWorkflow = await workflowsApi.performWorkflowAction(workflowId, stepOrder, action)
      
      // Update the workflow in state
      setWorkflows(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(quoteId => {
          if (updated[quoteId].id === workflowId) {
            updated[quoteId] = updatedWorkflow
          }
        })
        return updated
      })
      
      // Reload quotes to get updated status
      await loadQuotes()
      
    } catch (error) {
      console.error('Workflow action failed:', error)
      throw error
    }
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
    <div className="space-y-6">
      {loadingWorkflows && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-800 text-sm">Loading approval workflows...</span>
          </div>
        </div>
      )}
      
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          workflow={quote.workflow_id ? workflows[quote.id] : undefined}
          onWorkflowAction={handleWorkflowAction}
          onQuoteDeleted={loadQuotes}
          showWorkflow={true}
          compact={false}
          useRealtime={true}
        />
      ))}
    </div>
  )
}