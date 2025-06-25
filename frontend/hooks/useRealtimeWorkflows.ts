'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ApprovalWorkflow, 
  WorkflowStep,
  WorkflowActionRequest,
  WorkflowStepStatus 
} from '@/types/workflows'
import { showToast } from '@/lib/toast'

// Conflict resolution strategies
export enum ConflictResolution {
  MERGE_LATEST = 'merge_latest',
  USER_WINS = 'user_wins',
  SERVER_WINS = 'server_wins'
}

// Real-time event types
interface WorkflowStepEvent {
  id: string
  workflow_id: string
  step_order: number
  status: WorkflowStepStatus
  completed_by?: string
  completed_at?: string
  comments?: string
  rejection_reason?: string
  version: number
  updated_at: string
}

interface WorkflowEvent {
  id: string
  status: string
  updated_at: string
  version: number
}

// Conflict detection and resolution
interface ConflictState {
  hasConflict: boolean
  conflictingStep?: WorkflowStep
  userAction?: WorkflowActionRequest
  serverVersion?: WorkflowStep
  resolution?: ConflictResolution
}

export function useRealtimeWorkflows(initialWorkflows: Record<string, ApprovalWorkflow> = {}) {
  const [workflows, setWorkflows] = useState<Record<string, ApprovalWorkflow>>(initialWorkflows)
  const [conflicts, setConflicts] = useState<Record<string, ConflictState>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  // Track pending actions to detect conflicts
  const pendingActions = useRef<Map<string, { action: WorkflowActionRequest; timestamp: number }>>(new Map())
  const subscriptions = useRef<Set<string>>(new Set())

  // Optimistic update helper
  const optimisticUpdate = useCallback((workflowId: string, updater: (workflow: ApprovalWorkflow) => ApprovalWorkflow) => {
    setWorkflows(prev => {
      const workflow = prev[workflowId]
      if (!workflow) return prev
      
      return {
        ...prev,
        [workflowId]: updater(workflow)
      }
    })
  }, [])

  // Load workflow by ID
  const loadWorkflow = useCallback(async (workflowId: string): Promise<ApprovalWorkflow | null> => {
    try {
      setLoading(true)
      const { workflowsApi } = await import('../lib/api')
      const workflow = await workflowsApi.getWorkflow(workflowId)
      
      if (workflow) {
        setWorkflows(prev => ({
          ...prev,
          [workflowId]: workflow
        }))
      }
      
      setError('')
      return workflow
    } catch (err) {
      console.error('Error loading workflow:', err)
      setError(`Failed to load workflow: ${err}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Detect conflicts between user action and server state
  const detectConflict = useCallback((workflowId: string, stepOrder: number, serverStep: WorkflowStep): ConflictState => {
    const pendingKey = `${workflowId}-${stepOrder}`
    const pendingAction = pendingActions.current.get(pendingKey)
    
    if (!pendingAction) {
      return { hasConflict: false }
    }
    
    const currentWorkflow = workflows[workflowId]
    if (!currentWorkflow) {
      return { hasConflict: false }
    }
    
    const currentStep = currentWorkflow.steps.find(s => s.order === stepOrder)
    if (!currentStep) {
      return { hasConflict: false }
    }
    
    // Check if server state differs from what user expected
    const hasStatusConflict = serverStep.status !== currentStep.status
    const hasTimestampConflict = new Date(serverStep.updated_at) > new Date(currentStep.updated_at)
    
    if (hasStatusConflict || hasTimestampConflict) {
      return {
        hasConflict: true,
        conflictingStep: currentStep,
        userAction: pendingAction.action,
        serverVersion: serverStep,
        resolution: ConflictResolution.MERGE_LATEST // Default strategy
      }
    }
    
    return { hasConflict: false }
  }, [workflows])

  // Resolve conflict based on strategy
  const resolveConflict = useCallback(async (workflowId: string, stepOrder: number, resolution: ConflictResolution) => {
    const conflictKey = `${workflowId}-${stepOrder}`
    const conflict = conflicts[conflictKey]
    
    if (!conflict?.hasConflict) return
    
    try {
      switch (resolution) {
        case ConflictResolution.MERGE_LATEST:
          // Accept server version and notify user
          if (conflict.serverVersion) {
            optimisticUpdate(workflowId, workflow => ({
              ...workflow,
              steps: workflow.steps.map(step => 
                step.order === stepOrder ? conflict.serverVersion! : step
              ),
              updated_at: new Date().toISOString()
            }))
            
            showToast.info(
              `Step ${stepOrder} was updated by another user. Showing latest version.`
            )
          }
          break
          
        case ConflictResolution.USER_WINS:
          // Retry user action with force flag
          if (conflict.userAction) {
            await performWorkflowAction(workflowId, stepOrder, {
              ...conflict.userAction,
              force_update: true
            })
          }
          break
          
        case ConflictResolution.SERVER_WINS:
          // Accept server version silently
          if (conflict.serverVersion) {
            optimisticUpdate(workflowId, workflow => ({
              ...workflow,
              steps: workflow.steps.map(step => 
                step.order === stepOrder ? conflict.serverVersion! : step
              )
            }))
          }
          break
      }
      
      // Clear conflict
      setConflicts(prev => {
        const updated = { ...prev }
        delete updated[conflictKey]
        return updated
      })
      
      // Clear pending action
      pendingActions.current.delete(`${workflowId}-${stepOrder}`)
      
    } catch (error) {
      console.error('Error resolving conflict:', error)
      showToast.error('Failed to resolve workflow conflict')
    }
  }, [conflicts, optimisticUpdate])

  // Perform workflow action with conflict detection
  const performWorkflowAction = useCallback(async (
    workflowId: string, 
    stepOrder: number, 
    action: WorkflowActionRequest & { force_update?: boolean }
  ) => {
    const actionKey = `${workflowId}-${stepOrder}`
    
    // Track pending action for conflict detection
    pendingActions.current.set(actionKey, {
      action,
      timestamp: Date.now()
    })
    
    // Optimistic update
    optimisticUpdate(workflowId, workflow => {
      const updatedSteps = workflow.steps.map(step => {
        if (step.order === stepOrder) {
          return {
            ...step,
            status: action.action === 'approve' 
              ? WorkflowStepStatus.APPROVED 
              : action.action === 'reject'
              ? WorkflowStepStatus.REJECTED
              : step.status,
            completed_by: action.action === 'approve' || action.action === 'reject' 
              ? 'current-user' // Replace with actual user
              : step.completed_by,
            completed_at: action.action === 'approve' || action.action === 'reject'
              ? new Date().toISOString()
              : step.completed_at,
            comments: action.comments || step.comments,
            rejection_reason: action.action === 'reject' 
              ? action.rejection_reason 
              : step.rejection_reason,
            updated_at: new Date().toISOString()
          }
        }
        return step
      })
      
      return {
        ...workflow,
        steps: updatedSteps,
        updated_at: new Date().toISOString()
      }
    })
    
    try {
      // Use workflowsApi for better error handling
      const { workflowsApi } = await import('../lib/api')
      const updatedWorkflow = await workflowsApi.performWorkflowAction(workflowId, stepOrder, action)
      
      // Replace optimistic update with server response
      setWorkflows(prev => ({
        ...prev,
        [workflowId]: updatedWorkflow
      }))
      
      // Clear pending action on success
      pendingActions.current.delete(actionKey)
      
      // Broadcast the change
      const channel = supabase.channel('workflow_updates')
      channel.send({
        type: 'broadcast',
        event: 'workflow_step_updated',
        payload: {
          workflow_id: workflowId,
          step_order: stepOrder,
          step: updatedWorkflow.steps.find((s: WorkflowStep) => s.order === stepOrder),
          action: action.action,
          updated_by: 'current-user' // Replace with actual user
        }
      })
      
      return updatedWorkflow
      
    } catch (error) {
      // Revert optimistic update on error
      const workflow = workflows[workflowId]
      if (workflow) {
        setWorkflows(prev => ({
          ...prev,
          [workflowId]: workflow
        }))
      }
      
      // Clear pending action
      pendingActions.current.delete(actionKey)
      
      console.error('Workflow action failed:', error)
      throw error
    }
  }, [workflows, optimisticUpdate])

  // Subscribe to workflow updates
  const subscribeToWorkflow = useCallback((workflowId: string) => {
    if (subscriptions.current.has(workflowId)) {
      return // Already subscribed
    }
    
    subscriptions.current.add(workflowId)
    
    // Listen to workflow_steps table changes via broadcast
    const channel = supabase.channel(`workflow_${workflowId}`)
    
    channel
      .on('broadcast', { event: 'workflow_step_updated' }, (payload) => {
        const { workflow_id, step_order, step, action, updated_by } = payload.payload
        
        if (workflow_id !== workflowId) return
        
        console.log('Real-time workflow step update:', payload.payload)
        
        // Check for conflicts
        const conflict = detectConflict(workflowId, step_order, step)
        
        if (conflict.hasConflict) {
          const conflictKey = `${workflowId}-${step_order}`
          setConflicts(prev => ({
            ...prev,
            [conflictKey]: conflict
          }))
          
          showToast.warning(
            `Conflict detected on Step ${step_order}. Another user made changes.`,
          )
          
          return
        }
        
        // No conflict - apply update
        optimisticUpdate(workflowId, workflow => ({
          ...workflow,
          steps: workflow.steps.map(s => 
            s.order === step_order ? step : s
          ),
          updated_at: new Date().toISOString()
        }))
        
        // Show notification for external updates
        if (updated_by !== 'current-user') {
          const actionText = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'
          showToast.info(`Step ${step_order} was ${actionText} by ${updated_by}`)
        }
      })
      .on('broadcast', { event: 'workflow_updated' }, (payload) => {
        const { workflow } = payload.payload
        
        if (workflow.id !== workflowId) return
        
        console.log('Real-time workflow update:', payload.payload)
        
        setWorkflows(prev => ({
          ...prev,
          [workflowId]: workflow
        }))
      })
      .subscribe((status) => {
        console.log(`Workflow ${workflowId} subscription status:`, status)
      })
    
    return () => {
      console.log(`Unsubscribing from workflow ${workflowId}`)
      subscriptions.current.delete(workflowId)
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [detectConflict, optimisticUpdate])

  // Unsubscribe from workflow
  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    subscriptions.current.delete(workflowId)
    const channel = supabase.getChannels().find(c => c.topic === `workflow_${workflowId}`)
    if (channel) {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  // Auto-subscribe to workflows when they're added
  useEffect(() => {
    Object.keys(workflows).forEach(workflowId => {
      subscribeToWorkflow(workflowId)
    })
    
    return () => {
      // Cleanup all subscriptions
      subscriptions.current.forEach(workflowId => {
        unsubscribeFromWorkflow(workflowId)
      })
      subscriptions.current.clear()
    }
  }, [Object.keys(workflows).join(',')]) // Re-run when workflow IDs change

  // Clean up old pending actions (older than 30 seconds)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      const staleThreshold = 30000 // 30 seconds
      
      pendingActions.current.forEach((value, key) => {
        if (now - value.timestamp > staleThreshold) {
          pendingActions.current.delete(key)
        }
      })
    }, 10000) // Check every 10 seconds
    
    return () => clearInterval(cleanup)
  }, [])

  return {
    workflows,
    conflicts,
    loading,
    error,
    loadWorkflow,
    performWorkflowAction,
    resolveConflict,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    optimisticUpdate
  }
}

// Hook for managing a single workflow with real-time updates
export function useRealtimeWorkflow(workflowId: string | null) {
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null)
  const [conflicts, setConflicts] = useState<Record<string, ConflictState>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  const {
    workflows,
    conflicts: allConflicts,
    loading: globalLoading,
    error: globalError,
    loadWorkflow,
    performWorkflowAction,
    resolveConflict,
    subscribeToWorkflow,
    unsubscribeFromWorkflow
  } = useRealtimeWorkflows(workflow ? { [workflowId!]: workflow } : {})
  
  // Sync single workflow state
  useEffect(() => {
    if (workflowId && workflows[workflowId]) {
      setWorkflow(workflows[workflowId])
    }
  }, [workflowId, workflows])
  
  // Sync conflicts
  useEffect(() => {
    if (workflowId) {
      const workflowConflicts = Object.keys(allConflicts)
        .filter(key => key.startsWith(workflowId))
        .reduce((acc, key) => {
          acc[key] = allConflicts[key]
          return acc
        }, {} as Record<string, ConflictState>)
      
      setConflicts(workflowConflicts)
    }
  }, [workflowId, allConflicts])
  
  // Sync loading and error states
  useEffect(() => {
    setLoading(globalLoading)
    setError(globalError)
  }, [globalLoading, globalError])
  
  // Load workflow on mount
  useEffect(() => {
    if (workflowId && !workflow) {
      loadWorkflow(workflowId)
    }
  }, [workflowId, workflow, loadWorkflow])
  
  // Subscribe to updates
  useEffect(() => {
    if (workflowId) {
      const unsubscribe = subscribeToWorkflow(workflowId)
      return unsubscribe
    }
  }, [workflowId, subscribeToWorkflow])
  
  const handleWorkflowAction = useCallback(async (stepOrder: number, action: WorkflowActionRequest) => {
    if (!workflowId) throw new Error('No workflow ID provided')
    return performWorkflowAction(workflowId, stepOrder, action)
  }, [workflowId, performWorkflowAction])
  
  const handleConflictResolution = useCallback((stepOrder: number, resolution: ConflictResolution) => {
    if (!workflowId) return
    return resolveConflict(workflowId, stepOrder, resolution)
  }, [workflowId, resolveConflict])
  
  return {
    workflow,
    conflicts,
    loading,
    error,
    performWorkflowAction: handleWorkflowAction,
    resolveConflict: handleConflictResolution,
    reload: workflowId ? () => loadWorkflow(workflowId) : undefined
  }
}