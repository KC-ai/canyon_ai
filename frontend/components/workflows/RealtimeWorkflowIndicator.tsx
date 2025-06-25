import React from 'react'
import { useRealtimeWorkflow } from '../../hooks/useRealtimeWorkflows'

interface RealtimeWorkflowIndicatorProps {
  workflowId: string
  className?: string
}

const RealtimeWorkflowIndicator: React.FC<RealtimeWorkflowIndicatorProps> = ({
  workflowId,
  className = ''
}) => {
  const { workflow, conflicts, loading } = useRealtimeWorkflow(workflowId)
  
  if (!workflow) return null
  
  const activeConflicts = Object.keys(conflicts || {}).filter(key => conflicts[key]?.hasConflict)
  const hasConflicts = activeConflicts.length > 0
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection status */}
      <div className=\"flex items-center gap-1\">
        <div className={`w-2 h-2 rounded-full ${
          loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
        }`}></div>
        <span className=\"text-xs text-gray-500\">
          {loading ? 'Syncing...' : 'Live'}
        </span>
      </div>
      
      {/* Conflict indicator */}
      {hasConflicts && (
        <div className=\"flex items-center gap-1 text-orange-600\">
          <svg className=\"w-3 h-3\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
            <path fillRule=\"evenodd\" d=\"M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z\" clipRule=\"evenodd\" />
          </svg>
          <span className=\"text-xs font-medium\">
            {activeConflicts.length} conflict{activeConflicts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      
      {/* Active users indicator (placeholder for future enhancement) */}
      <div className=\"flex items-center gap-1 text-gray-500\">
        <svg className=\"w-3 h-3\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
          <path d=\"M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z\" />
        </svg>
        <span className=\"text-xs\">1 user</span>
      </div>
    </div>
  )
}

export default RealtimeWorkflowIndicator