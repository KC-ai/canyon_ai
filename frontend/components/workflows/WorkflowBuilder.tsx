import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ApprovalWorkflowCreate,
  WorkflowStepFormData,
  WorkflowBuilderProps,
  PersonaType,
  DragDropResult,
  DragDropWorkflowStep,
  WorkflowFormData,
  WorkflowFormErrors,
  validateWorkflowForm,
  getNextStepOrder,
  getPersonaDisplayName
} from '../../types/workflows'
import {
  DragDropProvider,
  SortableContainer,
  useDragDropItems,
  fromDragDropItems
} from './DragDropProvider'
import { LoadingSpinner, LoadingOverlay } from '../ui/LoadingSpinner'
import { ErrorMessage, SuccessMessage } from '../ui/ErrorMessage'
import { ConfirmDialog } from '../ui/ConfirmDialog'

// Enhanced step builder with drag handles
const SortableStepBuilder: React.FC<{
  step: WorkflowStepFormData
  index: number
  onUpdate: (index: number, step: WorkflowStepFormData) => void
  onRemove: (index: number) => void
  errors?: any
  isOptimisticUpdate?: boolean
}> = ({ step, index, onUpdate, onRemove, errors = {}, isOptimisticUpdate = false }) => {
  const handleChange = (field: keyof WorkflowStepFormData, value: any) => {
    onUpdate(index, { ...step, [field]: value })
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id || `step-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 space-y-4 transition-all duration-200 hover:border-gray-300 hover:shadow-sm ${
        isOptimisticUpdate ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
      } ${isDragging ? 'shadow-lg border-blue-300' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div 
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
            {step.order}
          </div>
          <h4 className="font-medium text-gray-900">Step {step.order}</h4>
          {isOptimisticUpdate && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              Saving...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800 text-sm font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors"
          disabled={isOptimisticUpdate}
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Step Name *
          </label>
          <input
            type="text"
            value={step.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Manager Approval"
            disabled={isOptimisticUpdate}
          />
          {errors.name && (
            <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To *
          </label>
          <select
            value={step.persona}
            onChange={(e) => handleChange('persona', e.target.value as PersonaType)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.persona ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isOptimisticUpdate}
          >
            <option value="">Select persona...</option>
            {Object.values(PersonaType).map(persona => (
              <option key={persona} value={persona}>
                {getPersonaDisplayName(persona)}
              </option>
            ))}
          </select>
          {errors.persona && (
            <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.persona}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Processing Days
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={step.max_processing_days}
            onChange={(e) => handleChange('max_processing_days', parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isOptimisticUpdate}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auto-Approve Threshold ($)
          </label>
          <input
            type="text"
            value={step.auto_approve_threshold}
            onChange={(e) => handleChange('auto_approve_threshold', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 10000"
            disabled={isOptimisticUpdate}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for manual approval
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={step.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Optional description for this step..."
          disabled={isOptimisticUpdate}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={step.is_required}
            onChange={(e) => handleChange('is_required', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isOptimisticUpdate}
          />
          <span className="ml-2 text-sm text-gray-700">Required step</span>
        </label>
      </div>
    </div>
  )
}


// Enhanced state management for loading, errors, and undo functionality
interface WorkflowState {
  isUpdating: boolean
  isDragging: boolean
  isSaving: boolean
  originalData: WorkflowFormData | null
  updateId: string | null
  error: string | null
  successMessage: string | null
  undoStack: WorkflowFormData[]
  redoStack: WorkflowFormData[]
  pendingAction: {
    type: 'delete' | 'reorder' | 'save' | null
    data?: any
  }
}

// Main WorkflowBuilder component
const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  onSave,
  onCancel,
  loading = false,
  showSubmit = true
}) => {
  // Form state
  const [formData, setFormData] = useState<WorkflowFormData>({
    name: initialWorkflow?.name || '',
    description: initialWorkflow?.description || '',
    trigger_amount: initialWorkflow?.trigger_amount?.toString() || '',
    trigger_discount_percent: initialWorkflow?.trigger_discount_percent?.toString() || '',
    auto_start: initialWorkflow?.auto_start ?? true,
    allow_parallel_steps: initialWorkflow?.allow_parallel_steps ?? false,
    require_all_approvals: initialWorkflow?.require_all_approvals ?? true,
    steps: initialWorkflow?.steps?.map(step => ({
      id: (step as any).id || `step-${step.order}-${Date.now()}`,
      name: step.name,
      description: step.description || '',
      persona: step.persona || '' as PersonaType,
      order: step.order,
      is_required: step.is_required,
      auto_approve_threshold: step.auto_approve_threshold?.toString() || '',
      escalation_threshold: step.escalation_threshold?.toString() || '',
      max_processing_days: step.max_processing_days || 3
    })) || []
  })

  // Enhanced state management
  const [errors, setErrors] = useState<WorkflowFormErrors>({})
  const [dragDropItems, setDragDropItems] = useState<DragDropWorkflowStep[]>(useDragDropItems(formData.steps || []))
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    isUpdating: false,
    isDragging: false,
    isSaving: false,
    originalData: null,
    updateId: null,
    error: null,
    successMessage: null,
    undoStack: [],
    redoStack: [],
    pendingAction: { type: null }
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedData, setLastSavedData] = useState<WorkflowFormData>(formData)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ action: () => void; title: string; message: string } | null>(null)
  
  // Refs for cleanup and tracking
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateIdRef = useRef<string | null>(null)
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null)

  // Update drag drop items when form steps change
  useEffect(() => {
    setDragDropItems(useDragDropItems(formData.steps || []))
  }, [formData.steps])

  // Initialize undo stack with initial state
  useEffect(() => {
    if (workflowState.undoStack.length === 0) {
      pushToUndoStack(formData)
    }
  }, []) // Only run on mount

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(lastSavedData)
    setHasUnsavedChanges(hasChanges)
  }, [formData, lastSavedData])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])


  // Enhanced state management functions
  const pushToUndoStack = useCallback((data: WorkflowFormData) => {
    setWorkflowState(prev => ({
      ...prev,
      undoStack: [...prev.undoStack, { ...data }].slice(-10), // Keep last 10 states
      redoStack: [] // Clear redo stack when new action is performed
    }))
  }, [])

  const handleSuccess = useCallback((message: string) => {
    setWorkflowState(prev => ({ ...prev, successMessage: message, isUpdating: false, isSaving: false }))
    
    // Auto-dismiss success message after 3 seconds
    setTimeout(() => {
      setWorkflowState(prev => ({ ...prev, successMessage: null }))
    }, 3000)
  }, [])

  const startOptimisticUpdate = useCallback((updateData: WorkflowFormData) => {
    const updateId = Date.now().toString()
    updateIdRef.current = updateId
    
    // Save current state for potential rollback
    pushToUndoStack(formData)
    
    setWorkflowState(prev => ({
      ...prev,
      isUpdating: true,
      originalData: { ...formData },
      updateId,
      error: null
    }))
    
    setFormData(updateData)
    
    // Auto-rollback after timeout if not resolved
    timeoutRef.current = setTimeout(() => {
      if (updateIdRef.current === updateId) {
        handleRollback()
      }
    }, 10000) // 10 second timeout
  }, [formData, pushToUndoStack])

  const handleRollback = useCallback(() => {
    if (workflowState.originalData) {
      setFormData(workflowState.originalData)
      setWorkflowState(prev => ({
        ...prev,
        isUpdating: false,
        originalData: null,
        updateId: null,
        error: 'Update failed - changes have been reverted'
      }))
    }
  }, [workflowState.originalData])

  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    setWorkflowState(prev => {
      if (prev.undoStack.length > 0) {
        const previousState = prev.undoStack[prev.undoStack.length - 1]
        const newUndoStack = prev.undoStack.slice(0, -1)
        
        // Set form data to previous state
        setFormData(previousState)
        handleSuccess('Changes undone')
        
        return {
          ...prev,
          undoStack: newUndoStack,
          redoStack: [...prev.redoStack, formData]
        }
      }
      return prev
    })
  }, [formData, handleSuccess])

  const handleRedo = useCallback(() => {
    setWorkflowState(prev => {
      if (prev.redoStack.length > 0) {
        const nextState = prev.redoStack[prev.redoStack.length - 1]
        const newRedoStack = prev.redoStack.slice(0, -1)
        
        // Set form data to next state
        setFormData(nextState)
        handleSuccess('Changes redone')
        
        return {
          ...prev,
          redoStack: newRedoStack,
          undoStack: [...prev.undoStack, formData]
        }
      }
      return prev
    })
  }, [formData, handleSuccess])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey)) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if ((event.key === 'y') || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          handleRedo()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Enhanced drag operation with loading states
  const handleDragStart = useCallback(() => {
    setWorkflowState(prev => ({ ...prev, isDragging: true }))
  }, [])

  const handleDragEnd = useCallback((result: DragDropResult) => {
    setWorkflowState(prev => ({ ...prev, isDragging: false }))
    
    if (!result.items || result.fromIndex === result.toIndex) return
    
    // Convert DragDropWorkflowStep back to WorkflowStepFormData
    const newSteps: WorkflowStepFormData[] = result.items.map((item, index) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      persona: item.persona,
      order: index + 1,
      is_required: item.is_required,
      auto_approve_threshold: item.auto_approve_threshold?.toString() || '',
      escalation_threshold: item.escalation_threshold?.toString() || '',
      max_processing_days: item.max_processing_days
    }))
    
    // Start optimistic update for drag operation
    setWorkflowState(prev => ({ ...prev, isUpdating: true }))
    
    const updatedFormData = { ...formData, steps: newSteps }
    startOptimisticUpdate(updatedFormData)
    
    // Simulate API call delay and success
    setTimeout(() => {
      setWorkflowState(prev => ({ ...prev, isUpdating: false }))
      handleSuccess('Workflow steps reordered successfully')
    }, 500)
  }, [formData, startOptimisticUpdate, handleSuccess])

  // Confirmation dialog helpers
  const showConfirmation = useCallback((title: string, message: string, action: () => void) => {
    setConfirmAction({ title, message, action })
    setShowConfirmDialog(true)
  }, [])

  const handleConfirmAction = useCallback(() => {
    if (confirmAction) {
      confirmAction.action()
      setShowConfirmDialog(false)
      setConfirmAction(null)
    }
  }, [confirmAction])

  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmDialog(false)
    setConfirmAction(null)
  }, [])

  // Template loading function
  const loadTemplate = useCallback((templateType: 'standard' | 'enterprise' | 'complete' | 'custom') => {
    pushToUndoStack(formData)
    
    const templates = {
      standard: {
        name: 'Standard Deal Approval',
        description: 'Standard approval workflow for deals up to $50,000',
        trigger_amount: '10000',
        trigger_discount_percent: '',
        auto_start: true,
        allow_parallel_steps: false,
        require_all_approvals: true,
        steps: [
          {
            id: `step-1-${Date.now()}`,
            name: 'Sales Manager Approval',
            description: 'Initial approval from sales management',
            persona: PersonaType.SALES_MANAGER,
            order: 1,
            is_required: true,
            auto_approve_threshold: '5000',
            escalation_threshold: '',
            max_processing_days: 2
          },
          {
            id: `step-2-${Date.now()}`,
            name: 'Deal Desk Review',
            description: 'Commercial terms and pricing review',
            persona: PersonaType.DEAL_DESK,
            order: 2,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 3
          },
          {
            id: `step-3-${Date.now()}`,
            name: 'Finance Approval',
            description: 'Final financial review and approval',
            persona: PersonaType.FINANCE,
            order: 3,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 5
          }
        ]
      },
      enterprise: {
        name: 'Enterprise Deal Approval',
        description: 'Comprehensive approval workflow for large enterprise deals over $100,000',
        trigger_amount: '100000',
        trigger_discount_percent: '',
        auto_start: true,
        allow_parallel_steps: false,
        require_all_approvals: true,
        steps: [
          {
            id: `step-1-${Date.now()}`,
            name: 'VP Sales Approval',
            description: 'Strategic review by VP of Sales',
            persona: PersonaType.VP_SALES,
            order: 1,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 3
          },
          {
            id: `step-2-${Date.now()}`,
            name: 'Legal Review',
            description: 'Contract terms and legal compliance review',
            persona: PersonaType.LEGAL,
            order: 2,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 5
          },
          {
            id: `step-3-${Date.now()}`,
            name: 'CRO Approval',
            description: 'Executive approval from Chief Revenue Officer',
            persona: PersonaType.CRO,
            order: 3,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 2
          },
          {
            id: `step-4-${Date.now()}`,
            name: 'Finance Approval',
            description: 'Final financial review and approval',
            persona: PersonaType.FINANCE,
            order: 4,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 3
          }
        ]
      },
      complete: {
        name: 'Complete Approval Chain',
        description: 'Full approval chain with all personas - remove steps as needed',
        trigger_amount: '',
        trigger_discount_percent: '',
        auto_start: true,
        allow_parallel_steps: false,
        require_all_approvals: true,
        steps: [
          {
            id: `step-1-${Date.now()}`,
            name: 'Account Executive Review',
            description: 'Initial review by the Account Executive',
            persona: PersonaType.AE,
            order: 1,
            is_required: false,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 1
          },
          {
            id: `step-2-${Date.now()}`,
            name: 'Sales Manager Approval',
            description: 'Review and approval from Sales Manager',
            persona: PersonaType.SALES_MANAGER,
            order: 2,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 2
          },
          {
            id: `step-3-${Date.now()}`,
            name: 'VP Sales Approval',
            description: 'Strategic review by VP of Sales',
            persona: PersonaType.VP_SALES,
            order: 3,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 3
          },
          {
            id: `step-4-${Date.now()}`,
            name: 'Deal Desk Review',
            description: 'Commercial terms and pricing review',
            persona: PersonaType.DEAL_DESK,
            order: 4,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 3
          },
          {
            id: `step-5-${Date.now()}`,
            name: 'Legal Review',
            description: 'Contract terms and legal compliance review',
            persona: PersonaType.LEGAL,
            order: 5,
            is_required: false,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 5
          },
          {
            id: `step-6-${Date.now()}`,
            name: 'Finance Approval',
            description: 'Financial review and approval',
            persona: PersonaType.FINANCE,
            order: 6,
            is_required: true,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 3
          },
          {
            id: `step-7-${Date.now()}`,
            name: 'CRO Final Approval',
            description: 'Executive approval from Chief Revenue Officer',
            persona: PersonaType.CRO,
            order: 7,
            is_required: false,
            auto_approve_threshold: '',
            escalation_threshold: '',
            max_processing_days: 2
          }
        ]
      },
      custom: {
        name: '',
        description: '',
        trigger_amount: '',
        trigger_discount_percent: '',
        auto_start: true,
        allow_parallel_steps: false,
        require_all_approvals: true,
        steps: []
      }
    }
    
    setFormData(templates[templateType])
    handleSuccess(`${templateType === 'custom' ? 'Custom' : templateType === 'complete' ? 'Complete Chain' : templateType.charAt(0).toUpperCase() + templateType.slice(1)} template loaded`)
  }, [formData, pushToUndoStack, handleSuccess])

  const confirmOptimisticUpdate = useCallback(() => {
    setWorkflowState(prev => ({
      ...prev,
      isUpdating: false,
      originalData: null,
      updateId: null,
      error: null
    }))
    setLastSavedData(formData)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [formData])

  // Auto-save functionality with debouncing
  const triggerAutoSave = useCallback(async (newFormData: WorkflowFormData) => {
    // Clear existing timeout
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current)
    }
    
    // Set new timeout for auto-save
    autoSaveTimeout.current = setTimeout(async () => {
      if (!hasUnsavedChanges) return
      
      try {
        const validationErrors = validateWorkflowForm(newFormData)
        if (Object.keys(validationErrors).length === 0) {
          startOptimisticUpdate(newFormData)
          
          // Simulate API call (replace with actual API)
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          confirmOptimisticUpdate()
        }
      } catch (error) {
        handleRollback()
      }
    }, 2000) // 2 second debounce
  }, [hasUnsavedChanges, startOptimisticUpdate, confirmOptimisticUpdate, handleRollback])

  // Handle form field changes
  const handleChange = (field: keyof WorkflowFormData, value: any) => {
    // Push current state to undo stack for significant changes
    if (field === 'name' || field === 'trigger_amount' || field === 'description') {
      pushToUndoStack(formData)
    }
    
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)
    
    // Clear workflow error
    if (workflowState.error) {
      setWorkflowState(prev => ({ ...prev, error: null }))
    }
    
    // Trigger auto-save for basic fields (not steps)
    if (field !== 'steps') {
      triggerAutoSave(newFormData)
    }
  }

  // Handle step updates with optimistic updates
  const handleStepUpdate = (index: number, step: WorkflowStepFormData) => {
    // Push to undo stack before major step changes
    pushToUndoStack(formData)
    
    const newSteps = [...formData.steps]
    newSteps[index] = step
    const newFormData = { ...formData, steps: newSteps }
    setFormData(newFormData)
    
    // Trigger auto-save for step updates
    triggerAutoSave(newFormData)
  }

  // Handle step removal with confirmation
  const handleStepRemove = (index: number) => {
    const stepToRemove = formData.steps[index]
    
    const performRemoval = () => {
      // Push to undo stack before removal
      pushToUndoStack(formData)
      
      const newSteps = formData.steps.filter((_, i) => i !== index)
      // Reorder the remaining steps
      const reorderedSteps = newSteps.map((step, i) => ({ ...step, order: i + 1 }))
      const newFormData = { ...formData, steps: reorderedSteps }
      setFormData(newFormData)
      
      // Trigger auto-save for step removal
      triggerAutoSave(newFormData)
      handleSuccess(`Step "${stepToRemove.name}" removed successfully`)
    }
    
    if (stepToRemove.name) {
      showConfirmation(
        'Remove Step',
        `Are you sure you want to remove "${stepToRemove.name}"? This action cannot be undone.`,
        performRemoval
      )
    } else {
      performRemoval()
    }
  }

  // Handle adding new step with optimistic update
  const handleStepAdd = () => {
    // Check if we've reached the maximum number of steps (equal to number of personas)
    const maxSteps = Object.values(PersonaType).length // 7 personas
    if (formData.steps.length >= maxSteps) {
      setWorkflowState(prev => ({ 
        ...prev, 
        error: `Maximum ${maxSteps} approval steps allowed (one per persona type)` 
      }))
      return
    }
    
    // Push to undo stack before adding step
    pushToUndoStack(formData)
    
    const newStep: WorkflowStepFormData = {
      id: `new-step-${Date.now()}`,
      name: '',
      description: '',
      persona: '' as PersonaType,
      order: getNextStepOrder(formData.steps),
      is_required: true,
      auto_approve_threshold: '',
      escalation_threshold: '',
      max_processing_days: 3
    }
    const newFormData = { ...formData, steps: [...formData.steps, newStep] }
    setFormData(newFormData)
    
    // Auto-save will be triggered when user fills in the step details
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const validationErrors = validateWorkflowForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      // Convert form data to API format
      const workflowData: ApprovalWorkflowCreate = {
        name: formData.name,
        description: formData.description || undefined,
        is_active: true,
        trigger_amount: formData.trigger_amount ? parseFloat(formData.trigger_amount) : undefined,
        trigger_discount_percent: formData.trigger_discount_percent ? parseFloat(formData.trigger_discount_percent) : undefined,
        auto_start: formData.auto_start,
        allow_parallel_steps: formData.allow_parallel_steps,
        require_all_approvals: formData.require_all_approvals,
        steps: formData.steps.map(step => ({
          name: step.name,
          description: step.description || undefined,
          persona: step.persona as PersonaType,
          order: step.order,
          is_required: step.is_required,
          auto_approve_threshold: step.auto_approve_threshold ? parseFloat(step.auto_approve_threshold) : undefined,
          escalation_threshold: step.escalation_threshold ? parseFloat(step.escalation_threshold) : undefined,
          max_processing_days: step.max_processing_days
        }))
      }

      await onSave(workflowData)
      setLastSavedData(formData)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save workflow:', error)
      setErrors({ general: 'Failed to save workflow. Please try again.' })
    }
  }

  // Handle cancel with unsaved changes warning
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      showConfirmation(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to cancel?',
        onCancel
      )
    } else {
      onCancel()
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {initialWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure the approval workflow for your quotes
            </p>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-3">
            {workflowState.isDragging && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                <LoadingSpinner size="sm" />
                Reordering...
              </div>
            )}
            
            {workflowState.isUpdating && !workflowState.isDragging && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                <LoadingSpinner size="sm" />
                Auto-saving...
              </div>
            )}
            
            {workflowState.isSaving && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                <LoadingSpinner size="sm" />
                Saving workflow...
              </div>
            )}
            
            {workflowState.error && (
              <ErrorMessage 
                error={workflowState.error}
                className="px-3 py-1 rounded-full text-sm"
                onDismiss={() => setWorkflowState(prev => ({ ...prev, error: null }))}
              />
            )}
            
            {workflowState.successMessage && (
              <SuccessMessage 
                message={workflowState.successMessage}
                className="px-3 py-1 rounded-full text-sm"
                onDismiss={() => setWorkflowState(prev => ({ ...prev, successMessage: null }))}
              />
            )}
            
            {hasUnsavedChanges && !workflowState.isUpdating && !workflowState.isSaving && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Unsaved changes
              </div>
            )}
            
            {!hasUnsavedChanges && !workflowState.isUpdating && !workflowState.isSaving && !workflowState.error && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Saved
              </div>
            )}
            
            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={workflowState.undoStack.length <= 1 || workflowState.isUpdating}
                className={`p-1 transition-colors ${
                  workflowState.undoStack.length > 1 && !workflowState.isUpdating
                    ? 'text-gray-600 hover:text-gray-800'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={workflowState.redoStack.length === 0 || workflowState.isUpdating}
                className={`p-1 transition-colors ${
                  workflowState.redoStack.length > 0 && !workflowState.isUpdating
                    ? 'text-gray-600 hover:text-gray-800'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Template Selector */}
        {!initialWorkflow && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Choose Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => loadTemplate('complete')}
                className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 text-left transition-colors"
              >
                <div className="font-medium text-gray-900">Complete Chain</div>
                <div className="text-sm text-gray-600 mt-1">All personas included - remove as needed</div>
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('standard')}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
              >
                <div className="font-medium text-gray-900">Standard Deal</div>
                <div className="text-sm text-gray-600 mt-1">3-step approval for deals up to $50K</div>
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('enterprise')}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
              >
                <div className="font-medium text-gray-900">Enterprise Deal</div>
                <div className="text-sm text-gray-600 mt-1">4-step approval for large deals $100K+</div>
              </button>
              <button
                type="button"
                onClick={() => loadTemplate('custom')}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
              >
                <div className="font-medium text-gray-900">Custom Workflow</div>
                <div className="text-sm text-gray-600 mt-1">Start from scratch</div>
              </button>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Standard Deal Approval"
              />
              {errors.name && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Amount ($)
              </label>
              <input
                type="text"
                value={formData.trigger_amount}
                onChange={(e) => handleChange('trigger_amount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 10000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum quote amount to trigger this workflow
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional workflow description..."
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.auto_start}
                onChange={(e) => handleChange('auto_start', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-start workflow</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_parallel_steps}
                onChange={(e) => handleChange('allow_parallel_steps', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow parallel steps</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.require_all_approvals}
                onChange={(e) => handleChange('require_all_approvals', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require all approvals</span>
            </label>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Approval Steps</h3>
              <p className="text-sm text-gray-600">Maximum {Object.values(PersonaType).length} steps allowed (one per persona)</p>
            </div>
            <button
              type="button"
              onClick={handleStepAdd}
              disabled={formData.steps.length >= Object.values(PersonaType).length}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Add Step
            </button>
          </div>

          {formData.steps.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No approval steps</h3>
              <p className="text-gray-600 mb-4">
                Add steps to define your approval workflow
              </p>
              <button
                type="button"
                onClick={handleStepAdd}
                disabled={formData.steps.length >= Object.values(PersonaType).length}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Add First Step
              </button>
            </div>
          ) : (
            <DragDropProvider 
              items={dragDropItems || []} 
              onReorder={handleDragEnd}
            >
              <SortableContainer items={dragDropItems || []}>
                {formData.steps.map((step, index) => (
                  <SortableStepBuilder
                    key={step.id}
                    step={step}
                    index={index}
                    onUpdate={handleStepUpdate}
                    onRemove={handleStepRemove}
                    errors={errors.steps?.[index] || {}}
                    isOptimisticUpdate={workflowState.isUpdating && workflowState.updateId === step.id}
                  />
                ))}
              </SortableContainer>
            </DragDropProvider>
          )}
        </div>

        {/* Form Actions */}
        {showSubmit && (
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          <div className="flex-1 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading || workflowState.isUpdating || workflowState.isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            
            {workflowState.error && (
              <button
                type="button"
                onClick={handleRollback}
                className="px-4 py-2 border border-red-300 rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Revert Changes
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            {hasUnsavedChanges && !workflowState.isUpdating && !workflowState.isSaving && (
              <div className="flex items-center text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-md">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Unsaved changes
              </div>
            )}
            
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || workflowState.isUpdating || workflowState.isSaving || formData.steps.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {initialWorkflow ? 'Update Workflow' : 'Create Workflow'}
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirmation}
        confirmButtonType={confirmAction?.title.includes('Remove') || confirmAction?.title.includes('Discard') ? 'danger' : 'primary'}
        loading={workflowState.isSaving}
      />
    </div>
  )
}

export default WorkflowBuilder