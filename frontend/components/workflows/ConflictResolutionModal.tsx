import React, { useState } from 'react'
import { 
  WorkflowStep, 
  WorkflowActionRequest, 
  getPersonaDisplayName,
  ApprovalAction 
} from '../../types/workflows'
import { ConflictResolution } from '../../hooks/useRealtimeWorkflows'

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  conflictingStep: WorkflowStep
  userAction: WorkflowActionRequest
  serverVersion: WorkflowStep
  onResolve: (resolution: ConflictResolution) => void
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflictingStep,
  userAction,
  serverVersion,
  onResolve
}) => {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution>(ConflictResolution.MERGE_LATEST)
  
  if (!isOpen) return null
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getActionText = (action: string) => {
    switch (action) {
      case ApprovalAction.APPROVE:
        return 'approve'
      case ApprovalAction.REJECT:
        return 'reject'
      case ApprovalAction.ESCALATE:
        return 'escalate'
      default:
        return action
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-700 bg-green-100'
      case 'rejected':
        return 'text-red-700 bg-red-100'
      case 'pending':
        return 'text-yellow-700 bg-yellow-100'
      case 'in_progress':
        return 'text-blue-700 bg-blue-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }
  
  const handleResolve = () => {
    onResolve(selectedResolution)
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Workflow Conflict Detected</h3>
                <p className="text-sm text-gray-600">Step {conflictingStep.order}: {conflictingStep.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Conflict explanation */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-orange-800 mb-2">What happened?</h4>
            <p className="text-orange-700 text-sm">
              You tried to {getActionText(userAction.action)} this step, but another user made changes to it 
              while you were working. We need to resolve this conflict before proceeding.
            </p>
          </div>
          
          {/* Comparison view */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Your changes */}
            <div className="border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <h4 className="font-medium text-blue-900">Your Action</h4>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Action:</span>
                  <span className="ml-2 capitalize">{getActionText(userAction.action)}</span>
                </div>
                
                {userAction.comments && (
                  <div>
                    <span className="font-medium text-gray-700">Comments:</span>
                    <p className="mt-1 text-gray-600 text-xs bg-gray-50 p-2 rounded">
                      {userAction.comments}
                    </p>
                  </div>
                )}
                
                {userAction.rejection_reason && (
                  <div>
                    <span className="font-medium text-gray-700">Rejection Reason:</span>
                    <p className="mt-1 text-red-600 text-xs bg-red-50 p-2 rounded">
                      {userAction.rejection_reason}
                    </p>
                  </div>
                )}
                
                <div>
                  <span className="font-medium text-gray-700">Intended Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    getStatusColor(userAction.action === 'approve' ? 'approved' : userAction.action === 'reject' ? 'rejected' : 'pending')
                  }`}>
                    {userAction.action === 'approve' ? 'Approved' : userAction.action === 'reject' ? 'Rejected' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Server changes */}
            <div className="border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <h4 className="font-medium text-green-900">Current Server State</h4>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(serverVersion.status)}`}>
                    {serverVersion.status.charAt(0).toUpperCase() + serverVersion.status.slice(1)}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Last Updated:</span>
                  <span className="ml-2 text-gray-600">{formatDate(serverVersion.updated_at)}</span>
                </div>
                
                {serverVersion.completed_by && (
                  <div>
                    <span className="font-medium text-gray-700">Completed By:</span>
                    <span className="ml-2 text-gray-600">{serverVersion.completed_by}</span>
                  </div>
                )}
                
                {serverVersion.comments && (
                  <div>
                    <span className="font-medium text-gray-700">Comments:</span>
                    <p className="mt-1 text-gray-600 text-xs bg-gray-50 p-2 rounded">
                      {serverVersion.comments}
                    </p>
                  </div>
                )}
                
                {serverVersion.rejection_reason && (
                  <div>
                    <span className="font-medium text-gray-700">Rejection Reason:</span>
                    <p className="mt-1 text-red-600 text-xs bg-red-50 p-2 rounded">
                      {serverVersion.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Resolution options */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">How would you like to resolve this?</h4>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value={ConflictResolution.MERGE_LATEST}
                  checked={selectedResolution === ConflictResolution.MERGE_LATEST}
                  onChange={(e) => setSelectedResolution(e.target.value as ConflictResolution)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Accept Server Changes (Recommended)</div>
                  <div className="text-sm text-gray-600">
                    Keep the changes made by the other user and discard your action. 
                    You can make a new action after reviewing their changes.
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value={ConflictResolution.USER_WINS}
                  checked={selectedResolution === ConflictResolution.USER_WINS}
                  onChange={(e) => setSelectedResolution(e.target.value as ConflictResolution)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Force My Changes</div>
                  <div className="text-sm text-gray-600">
                    Override the server changes with your action. 
                    <span className="text-orange-600 font-medium"> Use with caution</span> - this will undo the other user's work.
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value={ConflictResolution.SERVER_WINS}
                  checked={selectedResolution === ConflictResolution.SERVER_WINS}
                  onChange={(e) => setSelectedResolution(e.target.value as ConflictResolution)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Accept Silently</div>
                  <div className="text-sm text-gray-600">
                    Accept the server changes without notification and continue working.
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Resolve Conflict
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConflictResolutionModal