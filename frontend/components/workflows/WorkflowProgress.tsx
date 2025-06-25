import React from 'react'
import { 
  ApprovalWorkflow, 
  WorkflowStep, 
  WorkflowStepStatus, 
  PersonaType,
  WorkflowProgressProps,
  getPersonaDisplayName,
  getWorkflowStepStatusColor
} from '../../types/workflows'

// Status icon component with color-coded indicators
const StatusIcon: React.FC<{ status: WorkflowStepStatus }> = ({ status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case WorkflowStepStatus.PENDING:
        return (
          <div className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-yellow-500 flex items-center justify-center">
            <div className="w-1 h-1 bg-yellow-600 rounded-full"></div>
          </div>
        )
      case WorkflowStepStatus.IN_PROGRESS:
        return (
          <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-blue-500 flex items-center justify-center">
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        )
      case WorkflowStepStatus.APPROVED:
        return (
          <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-600 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case WorkflowStepStatus.REJECTED:
        return (
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case WorkflowStepStatus.SKIPPED:
        return (
          <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-gray-500 flex items-center justify-center">
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          </div>
        )
      default:
        return (
          <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-gray-400"></div>
        )
    }
  }

  return <div className="flex-shrink-0">{getStatusIcon()}</div>
}

// Persona icon component for different role types
const PersonaIcon: React.FC<{ persona: PersonaType }> = ({ persona }) => {
  const getPersonaIcon = () => {
    switch (persona) {
      case PersonaType.AE:
        return (
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
            AE
          </div>
        )
      case PersonaType.DEAL_DESK:
        return (
          <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium">
            DD
          </div>
        )
      case PersonaType.CRO:
        return (
          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">
            CRO
          </div>
        )
      case PersonaType.LEGAL:
        return (
          <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-medium">
            L
          </div>
        )
      case PersonaType.FINANCE:
        return (
          <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-medium">
            F
          </div>
        )
      case PersonaType.SALES_MANAGER:
        return (
          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-medium">
            SM
          </div>
        )
      case PersonaType.VP_SALES:
        return (
          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium">
            VP
          </div>
        )
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-medium">
            ?
          </div>
        )
    }
  }

  return <div className="flex-shrink-0">{getPersonaIcon()}</div>
}

// Individual step card component
const StepCard: React.FC<{
  step: WorkflowStep
  isLast: boolean
  showDetails: boolean
  isNextAction: boolean
}> = ({ step, isLast, showDetails, isNextAction }) => {
  const formatDate = (date: string | undefined) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusText = (status: WorkflowStepStatus) => {
    switch (status) {
      case WorkflowStepStatus.PENDING:
        return 'Pending'
      case WorkflowStepStatus.IN_PROGRESS:
        return 'In Progress'
      case WorkflowStepStatus.APPROVED:
        return 'Approved'
      case WorkflowStepStatus.REJECTED:
        return 'Rejected'
      case WorkflowStepStatus.SKIPPED:
        return 'Skipped'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="flex">
      {/* Timeline line and status */}
      <div className="flex flex-col items-center mr-4">
        <StatusIcon status={step.status} />
        {!isLast && (
          <div className={`w-0.5 h-12 mt-2 ${
            step.status === WorkflowStepStatus.APPROVED || step.status === WorkflowStepStatus.SKIPPED
              ? 'bg-green-200'
              : 'bg-gray-200'
          }`} />
        )}
      </div>

      {/* Step content */}
      <div className={`flex-1 pb-8 ${isNextAction ? 'ring-2 ring-blue-300 rounded-lg p-3 bg-blue-50' : ''}`}>
        <div className="flex items-center gap-3 mb-2">
          <PersonaIcon persona={step.persona} />
          <div className="flex-1">
            <h4 className={`font-medium ${isNextAction ? 'text-blue-900' : 'text-gray-900'}`}>
              {step.name}
            </h4>
            <p className={`text-sm ${isNextAction ? 'text-blue-700' : 'text-gray-600'}`}>
              {getPersonaDisplayName(step.persona)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              step.status === WorkflowStepStatus.PENDING
                ? 'bg-yellow-100 text-yellow-800'
                : step.status === WorkflowStepStatus.IN_PROGRESS
                ? 'bg-blue-100 text-blue-800'
                : step.status === WorkflowStepStatus.APPROVED
                ? 'bg-green-100 text-green-800'
                : step.status === WorkflowStepStatus.REJECTED
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {getStatusText(step.status)}
            </span>
            {isNextAction && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Action Required
              </span>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="ml-9 space-y-2">
            {step.description && (
              <p className="text-sm text-gray-600">{step.description}</p>
            )}
            
            {step.completed_at && step.completed_by && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Completed:</span> {formatDate(step.completed_at)} by {step.completed_by}
              </div>
            )}
            
            {step.assigned_at && step.status === WorkflowStepStatus.IN_PROGRESS && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Assigned:</span> {formatDate(step.assigned_at)}
                {step.days_remaining !== undefined && (
                  <span className={`ml-2 ${step.days_remaining < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    ({step.days_remaining < 0 ? `${Math.abs(step.days_remaining)} days overdue` : `${step.days_remaining} days remaining`})
                  </span>
                )}
              </div>
            )}
            
            {step.comments && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                <span className="font-medium">Comments:</span> {step.comments}
              </div>
            )}
            
            {step.rejection_reason && (
              <div className="text-xs text-red-600 bg-red-50 rounded p-2">
                <span className="font-medium">Rejection Reason:</span> {step.rejection_reason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Main WorkflowProgress component
const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ 
  workflow, 
  showDetails = true, 
  compact = false 
}) => {
  // Calculate progress percentage
  const completedSteps = workflow.steps.filter(step => 
    step.status === WorkflowStepStatus.APPROVED || step.status === WorkflowStepStatus.SKIPPED
  ).length
  const totalSteps = workflow.steps.length
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  // Find current/next step that needs action
  const currentStep = workflow.steps.find(step => 
    step.status === WorkflowStepStatus.PENDING || step.status === WorkflowStepStatus.IN_PROGRESS
  )

  // Check for overdue steps
  const overdueSteps = workflow.steps.filter(step => step.is_overdue).length

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Approval Progress</h3>
          <span className="text-sm text-gray-600">
            {completedSteps} of {totalSteps} complete
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Current step indicator */}
        {currentStep && (
          <div className="flex items-center gap-2 text-sm">
            <StatusIcon status={currentStep.status} />
            <span className="text-gray-600">Next:</span>
            <span className="font-medium">{currentStep.name}</span>
            <span className="text-gray-500">({getPersonaDisplayName(currentStep.persona)})</span>
          </div>
        )}
        
        {overdueSteps > 0 && (
          <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {overdueSteps} step{overdueSteps > 1 ? 's' : ''} overdue
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Approval Workflow</h3>
          <p className="text-sm text-gray-600 mt-1">
            {workflow.name} " {completedSteps} of {totalSteps} steps complete
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(progressPercentage)}%
          </div>
          <div className="text-sm text-gray-600">Complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${
            progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Workflow status indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalSteps}</div>
          <div className="text-sm text-gray-600">Total Steps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{completedSteps}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {workflow.steps.filter(s => s.status === WorkflowStepStatus.PENDING || s.status === WorkflowStepStatus.IN_PROGRESS).length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{overdueSteps}</div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
      </div>

      {/* Steps timeline */}
      <div className="space-y-0">
        {workflow.steps
          .sort((a, b) => a.order - b.order)
          .map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              isLast={index === workflow.steps.length - 1}
              showDetails={showDetails}
              isNextAction={currentStep?.id === step.id}
            />
          ))}
      </div>

      {/* Next action call-to-action */}
      {currentStep && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414-1.414L9 5.586 7.707 4.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Next Action Required</h4>
              <p className="text-sm text-blue-700 mt-1">
                <span className="font-medium">{currentStep.name}</span> is waiting for approval from{' '}
                <span className="font-medium">{getPersonaDisplayName(currentStep.persona)}</span>
                {currentStep.days_remaining !== undefined && currentStep.days_remaining < 3 && (
                  <span className="ml-2 text-red-600 font-medium">
                    (Due in {currentStep.days_remaining} day{currentStep.days_remaining !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
              {currentStep.description && (
                <p className="text-sm text-blue-600 mt-2">{currentStep.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow completed */}
      {progressPercentage === 100 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-green-900">Workflow Completed</h4>
              <p className="text-sm text-green-700">
                All required approvals have been obtained. This quote is ready to proceed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowProgress