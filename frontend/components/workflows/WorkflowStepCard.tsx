import React, { useState } from 'react'
import { 
  WorkflowStep, 
  ApprovalWorkflow,
  WorkflowStepStatus, 
  PersonaType,
  ApprovalAction,
  WorkflowActionRequest,
  WorkflowStepCardProps,
  getPersonaDisplayName,
  getWorkflowStepStatusColor
} from '../../types/workflows'
import { ErrorMessage } from '../ui/ErrorMessage'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ConfirmDialog } from '../ui/ConfirmDialog'

// Drag handle component
const DragHandle: React.FC<{ isDragging?: boolean }> = ({ isDragging = false }) => (
  <div className={`cursor-grab active:cursor-grabbing p-2 rounded-md transition-colors ${
    isDragging ? 'bg-gray-200' : 'hover:bg-gray-100'
  }`}>
    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 2a2 2 0 100 4 2 2 0 000-4zM7 8a2 2 0 100 4 2 2 0 000-4zM7 14a2 2 0 100 4 2 2 0 000-4zM13 2a2 2 0 100 4 2 2 0 000-4zM13 8a2 2 0 100 4 2 2 0 000-4zM13 14a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  </div>
)

// Status badge component
const StatusBadge: React.FC<{ 
  status: WorkflowStepStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean 
}> = ({ status, size = 'md', showIcon = true }) => {
  const getStatusConfig = () => {
    switch (status) {
      case WorkflowStepStatus.PENDING:
        return {
          text: 'Pending',
          classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L10 9.586V6z" clipRule="evenodd" />
            </svg>
          )
        }
      case WorkflowStepStatus.IN_PROGRESS:
        return {
          text: 'In Progress',
          classes: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: (
            <svg className="w-3 h-3 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          )
        }
      case WorkflowStepStatus.APPROVED:
        return {
          text: 'Approved',
          classes: 'bg-green-100 text-green-800 border-green-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )
        }
      case WorkflowStepStatus.REJECTED:
        return {
          text: 'Rejected',
          classes: 'bg-red-100 text-red-800 border-red-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )
        }
      case WorkflowStepStatus.SKIPPED:
        return {
          text: 'Skipped',
          classes: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 10a1 1 0 011-1h8.586l-2.293-2.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )
        }
      default:
        return {
          text: 'Unknown',
          classes: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        }
    }
  }

  const config = getStatusConfig()
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.classes} ${sizeClasses[size]}`}>
      {showIcon && config.icon}
      {config.text}
    </span>
  )
}

// Persona badge component
const PersonaBadge: React.FC<{ 
  persona: PersonaType
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showLabel?: boolean 
}> = ({ persona, size = 'md', showIcon = true, showLabel = true }) => {
  const getPersonaConfig = () => {
    switch (persona) {
      case PersonaType.AE:
        return { text: 'Account Executive', short: 'AE', classes: 'bg-blue-100 text-blue-800 border-blue-200' }
      case PersonaType.DEAL_DESK:
        return { text: 'Deal Desk', short: 'DD', classes: 'bg-green-100 text-green-800 border-green-200' }
      case PersonaType.CRO:
        return { text: 'Chief Revenue Officer', short: 'CRO', classes: 'bg-purple-100 text-purple-800 border-purple-200' }
      case PersonaType.LEGAL:
        return { text: 'Legal Team', short: 'L', classes: 'bg-orange-100 text-orange-800 border-orange-200' }
      case PersonaType.FINANCE:
        return { text: 'Finance Team', short: 'F', classes: 'bg-red-100 text-red-800 border-red-200' }
      case PersonaType.SALES_MANAGER:
        return { text: 'Sales Manager', short: 'SM', classes: 'bg-teal-100 text-teal-800 border-teal-200' }
      case PersonaType.VP_SALES:
        return { text: 'VP of Sales', short: 'VP', classes: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
      default:
        return { text: 'Unknown', short: '?', classes: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
  }

  const config = getPersonaConfig()
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.classes} ${sizeClasses[size]}`}>
      {showIcon && (
        <div className="w-4 h-4 rounded-full bg-current opacity-20 flex items-center justify-center">
          <span className="text-xs font-bold opacity-100">{config.short}</span>
        </div>
      )}
      {showLabel && (size === 'lg' ? config.text : config.short)}
    </span>
  )
}

// Action modal component
const ActionModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  step: WorkflowStep
  action: ApprovalAction
  onSubmit: (data: WorkflowActionRequest) => Promise<void>
  loading?: boolean
}> = ({ isOpen, onClose, step, action, onSubmit, loading = false }) => {
  const [comments, setComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [escalateTo, setEscalateTo] = useState<PersonaType | ''>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const data: WorkflowActionRequest = {
      action,
      comments: comments.trim() || undefined,
      rejection_reason: action === ApprovalAction.REJECT ? rejectionReason.trim() : undefined,
      escalate_to: action === ApprovalAction.ESCALATE ? escalateTo as PersonaType : undefined
    }

    try {
      await onSubmit(data)
      // Don't close modal here - let parent component handle success
      setComments('')
      setRejectionReason('')
      setEscalateTo('')
    } catch (error) {
      console.error('Action failed:', error)
      // Error handling is now done in parent handleAction
    }
  }

  if (!isOpen) return null

  const actionText = {
    [ApprovalAction.APPROVE]: 'Approve',
    [ApprovalAction.REJECT]: 'Reject',
    [ApprovalAction.REQUEST_CHANGES]: 'Request Changes',
    [ApprovalAction.ESCALATE]: 'Escalate'
  }

  const actionColor = {
    [ApprovalAction.APPROVE]: 'green',
    [ApprovalAction.REJECT]: 'red',
    [ApprovalAction.REQUEST_CHANGES]: 'yellow',
    [ApprovalAction.ESCALATE]: 'blue'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {actionText[action]} Step: {step.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Comments field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {action === ApprovalAction.APPROVE && '(optional)'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add any comments or notes..."
                maxLength={2000}
              />
              <div className="text-xs text-gray-500 mt-1">
                {comments.length}/2000 characters
              </div>
            </div>

            {/* Rejection reason field */}
            {action === ApprovalAction.REJECT && (
              <div>
                <label className="block text-sm font-medium text-red-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  placeholder="Please explain why this step is being rejected..."
                  required
                  maxLength={1000}
                />
                <div className="text-xs text-red-500 mt-1">
                  {rejectionReason.length}/1000 characters
                </div>
              </div>
            )}

            {/* Escalation target field */}
            {action === ApprovalAction.ESCALATE && (
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Escalate To *
                </label>
                <select
                  value={escalateTo}
                  onChange={(e) => setEscalateTo(e.target.value as PersonaType)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select escalation target...</option>
                  {Object.values(PersonaType).map(persona => (
                    <option key={persona} value={persona}>
                      {getPersonaDisplayName(persona)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (action === ApprovalAction.REJECT && !rejectionReason.trim()) || (action === ApprovalAction.ESCALATE && !escalateTo)}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionColor[action] === 'green' ? 'bg-green-600 hover:bg-green-700' :
                  actionColor[action] === 'red' ? 'bg-red-600 hover:bg-red-700' :
                  actionColor[action] === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Processing...' : actionText[action]}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Main WorkflowStepCard component
const WorkflowStepCard: React.FC<WorkflowStepCardProps> = ({
  step,
  workflow,
  onApprove,
  onReject,
  onEscalate,
  readonly = false,
  showActions = true
}) => {
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean
    action: ApprovalAction | null
  }>({ isOpen: false, action: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ action: ApprovalAction; title: string; message: string } | null>(null)

  const canTakeAction = !readonly && showActions && (
    step.status === WorkflowStepStatus.PENDING || 
    step.status === WorkflowStepStatus.IN_PROGRESS
  )

  const handleAction = async (data: WorkflowActionRequest) => {
    setLoading(true)
    setError(null)
    try {
      switch (data.action) {
        case ApprovalAction.APPROVE:
          await onApprove(data)
          break
        case ApprovalAction.REJECT:
          await onReject(data)
          break
        case ApprovalAction.ESCALATE:
          await onEscalate(data)
          break
      }
      // Success - close modal
      setActionModal({ isOpen: false, action: null })
    } catch (error) {
      console.error('Workflow action failed:', error)
      const errorMessage = error instanceof Error ? error.message : `Failed to ${data.action.toLowerCase()} step. Please try again.`
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAction = () => {
    if (confirmAction) {
      setError(null)
      setActionModal({ isOpen: true, action: confirmAction.action })
      setShowConfirmDialog(false)
      setConfirmAction(null)
    }
  }

  const handleCancelConfirmation = () => {
    setShowConfirmDialog(false)
    setConfirmAction(null)
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = step.is_overdue
  const isNextAction = step.status === WorkflowStepStatus.PENDING || step.status === WorkflowStepStatus.IN_PROGRESS

  return (
    <>
      <div className={`bg-white border rounded-lg p-4 transition-all duration-200 ${
        isNextAction ? 'border-blue-300 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-gray-300'
      } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
        
        {/* Header with drag handle, title, and status */}
        <div className="flex items-start gap-3 mb-3">
          {!readonly && (
            <DragHandle />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  Step {step.order}: {step.name}
                </h4>
                {step.description && (
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={step.status} size="sm" />
                {step.is_required && (
                  <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                    Required
                  </span>
                )}
                {isOverdue && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Persona and timing information */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Assigned to:</span>
            <PersonaBadge persona={step.persona} size="sm" showLabel={true} />
          </div>
          
          {step.max_processing_days && (
            <div className="flex items-center gap-1 text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L10 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{step.max_processing_days} day{step.max_processing_days !== 1 ? 's' : ''} max</span>
            </div>
          )}
          
          {step.days_remaining !== undefined && step.status === WorkflowStepStatus.IN_PROGRESS && (
            <div className={`flex items-center gap-1 ${step.days_remaining < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              <span>
                {step.days_remaining < 0 ? `${Math.abs(step.days_remaining)} days overdue` : `${step.days_remaining} days remaining`}
              </span>
            </div>
          )}
        </div>

        {/* Timestamps and completion info */}
        <div className="space-y-2 text-sm text-gray-600">
          {step.assigned_at && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Assigned:</span>
              <span>{formatDate(step.assigned_at)}</span>
            </div>
          )}
          
          {step.completed_at && step.completed_by && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Completed:</span>
              <span>{formatDate(step.completed_at)} by {step.completed_by}</span>
            </div>
          )}
        </div>

        {/* Comments and notes */}
        {step.comments && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <div className="text-sm font-medium text-gray-700 mb-1">Comments:</div>
            <div className="text-sm text-gray-600">{step.comments}</div>
          </div>
        )}

        {/* Rejection reason */}
        {step.rejection_reason && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</div>
            <div className="text-sm text-red-600">{step.rejection_reason}</div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-3">
            <ErrorMessage 
              error={error} 
              onDismiss={() => setError(null)}
              className="text-sm"
            />
          </div>
        )}

        {/* Action buttons */}
        {canTakeAction && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            {loading && (
              <div className="mb-3 flex items-center justify-center">
                <LoadingSpinner size="sm" text="Processing..." />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setError(null)
                  setActionModal({ isOpen: true, action: ApprovalAction.APPROVE })
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                {loading && actionModal.action === ApprovalAction.APPROVE ? (
                  <LoadingSpinner size="sm" />
                ) : null}
                Approve
              </button>
              <button
                onClick={() => {
                  setError(null)
                  setConfirmAction({
                    action: ApprovalAction.REJECT,
                    title: 'Reject Step',
                    message: `Are you sure you want to reject "${step.name}"? This action will require a rejection reason and will stop the workflow.`
                  })
                  setShowConfirmDialog(true)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                {loading && actionModal.action === ApprovalAction.REJECT ? (
                  <LoadingSpinner size="sm" />
                ) : null}
                Reject
              </button>
              <button
                onClick={() => {
                  setError(null)
                  setActionModal({ isOpen: true, action: ApprovalAction.ESCALATE })
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                {loading && actionModal.action === ApprovalAction.ESCALATE ? (
                  <LoadingSpinner size="sm" />
                ) : null}
                Escalate
              </button>
            </div>
            
            {isNextAction && (
              <div className="mt-2 text-xs text-blue-600 text-center">
                This step requires your immediate attention
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal.action && (
        <ActionModal
          isOpen={actionModal.isOpen}
          onClose={() => {
            setActionModal({ isOpen: false, action: null })
            setError(null)
          }}
          step={step}
          action={actionModal.action}
          onSubmit={handleAction}
          loading={loading}
        />
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirmation}
        confirmButtonType="danger"
        loading={loading}
      />
    </>
  )
}

export default WorkflowStepCard