import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Quote, 
  QuoteStatus 
} from '../../types/quotes'
import {
  ApprovalWorkflow,
  WorkflowStepStatus,
  ApprovalAction,
  WorkflowActionRequest,
  PersonaType,
  WorkflowStatus
} from '../../types/workflows'
import { useRealtimeWorkflow, ConflictResolution } from '../../hooks/useRealtimeWorkflows'
import WorkflowProgress from '../workflows/WorkflowProgress'
import ConflictResolutionModal from '../workflows/ConflictResolutionModal'
import { showToast } from '@/lib/toast'

// Props for QuoteCard component
interface QuoteCardProps {
  quote: Quote
  workflow?: ApprovalWorkflow | null
  onWorkflowAction?: (workflowId: string, stepOrder: number, action: WorkflowActionRequest) => Promise<void>
  compact?: boolean
  showWorkflow?: boolean
  className?: string
  useRealtime?: boolean
}

// Quick action buttons for workflow steps
const QuickActionButtons: React.FC<{
  workflow: ApprovalWorkflow
  onAction: (stepOrder: number, action: WorkflowActionRequest) => Promise<void>
  disabled?: boolean
}> = ({ workflow, onAction, disabled = false }) => {
  const [loading, setLoading] = useState<string | null>(null)
  
  // Find the next pending step that can be acted upon
  const nextStep = workflow.steps.find(step => 
    step.status === WorkflowStepStatus.PENDING || 
    step.status === WorkflowStepStatus.IN_PROGRESS
  )
  
  if (!nextStep || nextStep.status === WorkflowStepStatus.APPROVED) {
    return null
  }
  
  const handleQuickAction = async (action: ApprovalAction, comments?: string) => {
    if (!nextStep) return
    
    setLoading(action)
    try {
      await onAction(nextStep.order, {
        action,
        comments,
        rejection_reason: action === ApprovalAction.REJECT ? (comments || 'Quick rejection from quote card') : undefined
      })
      
      const actionText = action === ApprovalAction.APPROVE ? 'approved' : 'rejected'
      showToast.success(`Step ${nextStep.order} ${actionText} successfully`)
    } catch (error) {
      console.error('Quick action failed:', error)
      showToast.error(`Failed to ${action.toLowerCase()} step`)
    } finally {
      setLoading(null)
    }
  }
  
  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleQuickAction(ApprovalAction.APPROVE)}
        disabled={disabled || loading !== null}
        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
      >
        {loading === ApprovalAction.APPROVE ? (
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        Quick Approve
      </button>
      
      <button
        onClick={() => handleQuickAction(ApprovalAction.REJECT, 'Quick rejection from quote card')}
        disabled={disabled || loading !== null}
        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
      >
        {loading === ApprovalAction.REJECT ? (
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
        Quick Reject
      </button>
    </div>
  )
}

// Workflow status indicator
const WorkflowStatusIndicator: React.FC<{
  workflow: ApprovalWorkflow
  compact?: boolean
}> = ({ workflow, compact = false }) => {
  const getWorkflowStatusConfig = () => {
    switch (workflow.status) {
      case WorkflowStatus.ACTIVE:
        return {
          text: compact ? 'Pending Approval' : 'Awaiting Approval',
          classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L10 9.586V6z" clipRule="evenodd" />
            </svg>
          )
        }
      case WorkflowStatus.COMPLETED:
        return {
          text: compact ? 'Complete' : 'Workflow Complete',
          classes: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        }
      case WorkflowStatus.FAILED:
        return {
          text: compact ? 'Rejected' : 'Workflow Rejected',
          classes: 'bg-red-100 text-red-800 border-red-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )
        }
      default:
        return {
          text: 'Unknown Status',
          classes: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        }
    }
  }
  
  const config = getWorkflowStatusConfig()
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium ${config.classes}`}>
      {config.icon}
      {config.text}
    </span>
  )
}

// Main QuoteCard component
const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  workflow: initialWorkflow,
  onWorkflowAction,
  compact = false,
  showWorkflow = true,
  className = '',
  useRealtime = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [conflictModalOpen, setConflictModalOpen] = useState<string | null>(null)
  
  // Use real-time workflow hook if enabled and workflow exists
  const {
    workflow: realtimeWorkflow,
    conflicts,
    performWorkflowAction: realtimeAction,
    resolveConflict,
    loading: workflowLoading
  } = useRealtimeWorkflow(useRealtime && quote.workflow_id ? quote.workflow_id : null)
  
  // Use real-time workflow if available, otherwise fall back to prop
  const workflow = useRealtime && realtimeWorkflow ? realtimeWorkflow : initialWorkflow
  
  // Check for active conflicts
  const activeConflicts = Object.keys(conflicts || {}).filter(key => conflicts[key]?.hasConflict)
  
  useEffect(() => {
    if (activeConflicts.length > 0 && !conflictModalOpen) {
      // Show conflict modal for the first conflict
      setConflictModalOpen(activeConflicts[0])
    }
  }, [activeConflicts.length, conflictModalOpen])
  
  const getQuoteStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.APPROVED:
        return 'bg-green-100 text-green-800'
      case QuoteStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800'
      case QuoteStatus.REJECTED:
        return 'bg-red-100 text-red-800'
      case QuoteStatus.EXPIRED:
        return 'bg-gray-100 text-gray-800'
      case QuoteStatus.DRAFT:
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const handleWorkflowAction = async (stepOrder: number, action: WorkflowActionRequest) => {
    if (!workflow) return
    
    try {
      if (useRealtime && realtimeAction) {
        // Use real-time action handler
        await realtimeAction(stepOrder, action)
      } else if (onWorkflowAction) {
        // Fall back to prop-based action handler
        await onWorkflowAction(workflow.id, stepOrder, action)
      }
    } catch (error) {
      console.error('Workflow action failed:', error)
      throw error // Re-throw to let QuickActionButtons handle the error
    }
  }
  
  const handleConflictResolution = (conflictKey: string, resolution: ConflictResolution) => {
    const stepOrder = parseInt(conflictKey.split('-').pop() || '0')
    if (resolveConflict) {
      resolveConflict(stepOrder, resolution)
    }
    setConflictModalOpen(null)
  }
  
  const hasWorkflowActions = workflow && 
    (onWorkflowAction || (useRealtime && realtimeAction)) && 
    workflow.steps.some(step => 
      step.status === WorkflowStepStatus.PENDING || 
      step.status === WorkflowStepStatus.IN_PROGRESS
    )
  
  const isTemporary = quote.id.startsWith('temp-')
  const needsApproval = quote.status === QuoteStatus.PENDING && workflow
  
  return (
    <div className={`relative bg-white border rounded-lg shadow hover:shadow-md transition-all duration-200 ${
      needsApproval ? 'ring-2 ring-yellow-200 border-yellow-300' : 'border-gray-200 hover:border-gray-300'
    } ${
      isTemporary ? 'opacity-60 border-dashed border-blue-300' : ''
    } ${
      activeConflicts.length > 0 ? 'ring-2 ring-orange-300 border-orange-400' : ''
    } ${className}`}>
      
      {/* Conflict indicator */}
      {activeConflicts.length > 0 && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
            !
          </div>
        </div>
      )}
      
      {/* Real-time loading indicator */}
      {workflowLoading && (
        <div className="absolute top-3 right-3 z-10">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Main card content */}
      <div className="p-4">
        {/* Statuses Row */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-xs text-gray-500">Quote Status:</span>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getQuoteStatusColor(quote.status)}`}
              title="This is the overall business status of the quote (Draft, Pending, Approved, Rejected)"
            >
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </span>
          </div>
          {workflow && (
            <div className="flex items-center gap-1">
              <span className="font-semibold text-xs text-gray-500">Workflow Status:</span>
              <span
                title="This is the status of the approval workflow for this quote (Awaiting Approval, Complete, etc.)"
              >
                <WorkflowStatusIndicator workflow={workflow} compact={true} />
              </span>
            </div>
          )}
        </div>
        
        {/* Header section */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-2">
              <Link 
                href={`/quotes/${quote.id}`}
                className="flex-1 min-w-0 group"
              >
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {quote.title}
                </h3>
              </Link>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  getQuoteStatusColor(quote.status)
                }`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
                
                {workflow && showWorkflow && (
                  <WorkflowStatusIndicator workflow={workflow} compact={compact} />
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">{quote.customer_name}</span>
              <span>{quote.items.length} item{quote.items.length !== 1 ? 's' : ''}</span>
              <span>Created {formatDate(quote.created_at)}</span>
              {quote.valid_until && (
                <span className={`font-medium ${
                  new Date(quote.valid_until) < new Date() ? 'text-red-600' : 'text-gray-600'
                }`}>
                  Expires {formatDate(quote.valid_until)}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(quote.total_amount)}
            </p>
            {workflow && showWorkflow && hasWorkflowActions && !compact && (
              <div className="mt-2">
                <QuickActionButtons 
                  workflow={workflow}
                  onAction={handleWorkflowAction}
                  disabled={isTemporary}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Workflow section */}
        {workflow && showWorkflow && (
          <div className="mt-4">
            {compact ? (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {workflow.steps.filter(s => s.status === WorkflowStepStatus.APPROVED).length} of {workflow.steps.length} steps approved
                </div>
                
                {hasWorkflowActions && (
                  <QuickActionButtons 
                    workflow={workflow}
                    onAction={handleWorkflowAction}
                    disabled={isTemporary}
                  />
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Approval Progress</h4>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {isExpanded ? 'Show Less' : 'Show Details'}
                  </button>
                </div>
                
                <WorkflowProgress 
                  workflow={workflow}
                  compact={!isExpanded}
                  showDetails={isExpanded}
                />
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Expanded workflow details */}
      {isExpanded && workflow && showWorkflow && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Workflow:</span>
                <span className="ml-2 text-gray-600">{workflow.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Started:</span>
                <span className="ml-2 text-gray-600">{formatDate(workflow.created_at)}</span>
              </div>
            </div>
            
            {workflow.description && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Description:</span>
                <p className="mt-1 text-gray-600">{workflow.description}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <Link 
                href={`/quotes/${quote.id}/workflow`}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                View Full Workflow
              </Link>
              
              {hasWorkflowActions && (
                <QuickActionButtons 
                  workflow={workflow}
                  onAction={handleWorkflowAction}
                  disabled={isTemporary}
                />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Loading overlay for temporary quotes */}
      {isTemporary && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Creating quote...</p>
          </div>
        </div>
      )}
      
      {/* Conflict Resolution Modal */}
      {conflictModalOpen && conflicts[conflictModalOpen] && (
        <ConflictResolutionModal
          isOpen={true}
          onClose={() => setConflictModalOpen(null)}
          conflictingStep={conflicts[conflictModalOpen].conflictingStep!}
          userAction={conflicts[conflictModalOpen].userAction!}
          serverVersion={conflicts[conflictModalOpen].serverVersion!}
          onResolve={(resolution) => handleConflictResolution(conflictModalOpen, resolution)}
        />
      )}
    </div>
  )
}

export default QuoteCard