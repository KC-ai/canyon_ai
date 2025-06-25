import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  closestCorners,
  rectIntersection,
  CollisionDetection,
  UniqueIdentifier,
  Active,
  Over,
  DragCancelEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { 
  DragDropWorkflowStep, 
  DragDropResult,
  WorkflowStepFormData
} from '../../types/workflows'

// Enhanced drag state interface
interface DragState {
  activeId: UniqueIdentifier | null
  overId: UniqueIdentifier | null
  isDragging: boolean
  draggedItem: DragDropWorkflowStep | null
  dragOffset: { x: number; y: number } | null
  dropZones: Set<string>
  isValidDrop: boolean
  dragError: string | null
}

// Context for drag and drop state
interface DragDropContextType extends DragState {
  setDraggedItem: (item: DragDropWorkflowStep | null) => void
  setDropZone: (id: string, active: boolean) => void
  clearError: () => void
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined)

export const useDragDrop = () => {
  const context = useContext(DragDropContext)
  if (context === undefined) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

// Simplified collision detection - use closest center algorithm
const enhancedCollisionDetection: CollisionDetection = closestCenter

// Props for the DragDropProvider
interface DragDropProviderProps {
  children: ReactNode
  items: DragDropWorkflowStep[]
  onReorder: (result: DragDropResult) => void
  disabled?: boolean
  className?: string
}

// Enhanced drag overlay with animations and state feedback
const DragOverlayContent: React.FC<{ 
  item: DragDropWorkflowStep | null
  isValidDrop: boolean
  dragError: string | null
}> = ({ item, isValidDrop, dragError }) => {
  if (!item) return null

  return (
    <div className={`
      bg-white rounded-lg p-4 shadow-2xl transform transition-all duration-200
      ${isValidDrop 
        ? 'border-2 border-green-400 rotate-2 scale-105' 
        : dragError 
        ? 'border-2 border-red-400 rotate-1 scale-95 animate-pulse' 
        : 'border-2 border-blue-400 rotate-3 scale-110'
      }
    `}>
      <div className="flex items-center gap-3">
        {/* Drag status indicator */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-200
          ${isValidDrop 
            ? 'bg-green-100 text-green-700' 
            : dragError 
            ? 'bg-red-100 text-red-700' 
            : 'bg-blue-100 text-blue-700'
          }
        `}>
          {isValidDrop ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : dragError ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            item.order
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {item.name || 'Untitled Step'}
          </h4>
          {item.description && (
            <p className="text-sm text-gray-600 truncate mt-1">{item.description}</p>
          )}
        </div>
        
        {/* Status text */}
        <div className={`
          text-xs font-medium px-2 py-1 rounded-full transition-colors duration-200
          ${isValidDrop 
            ? 'bg-green-100 text-green-700' 
            : dragError 
            ? 'bg-red-100 text-red-700' 
            : 'bg-blue-100 text-blue-700'
          }
        `}>
          {isValidDrop ? 'Drop to place' : dragError ? 'Invalid drop' : 'Dragging...'}
        </div>
      </div>
      
      {/* Error message */}
      {dragError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {dragError}
        </div>
      )}
      
      {/* Floating animation dots */}
      <div className="absolute -top-1 -right-1 flex gap-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )
}

// Sortable container component
export const SortableContainer: React.FC<{
  children: ReactNode
  items: DragDropWorkflowStep[]
  strategy?: any
}> = ({ 
  children, 
  items, 
  strategy = verticalListSortingStrategy 
}) => {
  return (
    <SortableContext items={items.map(item => item.dragId)} strategy={strategy}>
      {children}
    </SortableContext>
  )
}

// Main DragDropProvider component with enhanced state management
export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  items,
  onReorder,
  disabled = false,
  className = ''
}) => {
  // Enhanced drag state
  const [dragState, setDragState] = useState<DragState>({
    activeId: null,
    overId: null,
    isDragging: false,
    draggedItem: null,
    dragOffset: null,
    dropZones: new Set(),
    isValidDrop: false,
    dragError: null
  })

  // Configure sensors with enhanced activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
        delay: 100,  // Small delay to differentiate from clicks
        tolerance: 5 // Movement tolerance during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Validate drop operation
  const validateDrop = (activeId: UniqueIdentifier, overId: UniqueIdentifier): { isValid: boolean; error?: string } => {
    if (activeId === overId) {
      return { isValid: false, error: 'Cannot drop item on itself' }
    }

    const activeItem = items.find(item => item.dragId === activeId)
    const overItem = items.find(item => item.dragId === overId)

    if (!activeItem || !overItem) {
      return { isValid: false, error: 'Invalid drop target' }
    }

    // Add custom validation rules here
    // For example: prevent moving required steps to certain positions
    if (activeItem.is_required && overItem.order === 1) {
      // This is just an example rule
      // return { isValid: false, error: 'Required steps cannot be placed first' }
    }

    return { isValid: true }
  }

  // Handle drag start with enhanced state
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    
    // Find the dragged item
    const item = items.find(item => item.dragId === active.id)
    if (!item) return

    setDragState(prev => ({
      ...prev,
      activeId: active.id,
      isDragging: true,
      draggedItem: item,
      dragError: null,
      isValidDrop: false
    }))

    // Add visual feedback class to body for cursor changes
    document.body.classList.add('dragging')
  }

  // Handle drag over with real-time validation
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over || !active) return

    const validation = validateDrop(active.id, over.id)
    
    setDragState(prev => ({
      ...prev,
      overId: over.id,
      isValidDrop: validation.isValid,
      dragError: validation.error || null
    }))
  }

  // Handle drag end with error handling
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    // Clean up state
    setDragState(prev => ({
      ...prev,
      activeId: null,
      overId: null,
      isDragging: false,
      draggedItem: null,
      dragOffset: null,
      isValidDrop: false,
      dragError: null
    }))

    // Remove visual feedback class
    document.body.classList.remove('dragging')

    if (!over || active.id === over.id) {
      return
    }

    // Validate the drop operation
    const validation = validateDrop(active.id, over.id)
    if (!validation.isValid) {
      // Show error feedback
      setDragState(prev => ({
        ...prev,
        dragError: validation.error || 'Invalid drop operation'
      }))
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setDragState(prev => ({ ...prev, dragError: null }))
      }, 3000)
      
      return
    }

    // Find the items being moved
    const activeIndex = items.findIndex(item => item.dragId === active.id)
    const overIndex = items.findIndex(item => item.dragId === over.id)

    if (activeIndex === -1 || overIndex === -1) {
      setDragState(prev => ({
        ...prev,
        dragError: 'Could not find items to reorder'
      }))
      return
    }

    try {
      // Reorder the items with smooth animation
      const reorderedItems = arrayMove(items, activeIndex, overIndex)

      // Update the order property to match new positions
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        order: index + 1
      }))

      // Call the onReorder callback
      onReorder({
        fromIndex: activeIndex,
        toIndex: overIndex,
        items: updatedItems
      })
    } catch (error) {
      setDragState(prev => ({
        ...prev,
        dragError: 'Failed to reorder items'
      }))
    }
  }

  // Handle drag cancel
  const handleDragCancel = (event: DragCancelEvent) => {
    setDragState(prev => ({
      ...prev,
      activeId: null,
      overId: null,
      isDragging: false,
      draggedItem: null,
      dragOffset: null,
      isValidDrop: false,
      dragError: null
    }))

    document.body.classList.remove('dragging')
  }

  // Context value with enhanced state
  const contextValue: DragDropContextType = {
    ...dragState,
    setDraggedItem: (item) => setDragState(prev => ({ ...prev, draggedItem: item })),
    setDropZone: (id, active) => {
      setDragState(prev => {
        const newDropZones = new Set(prev.dropZones)
        if (active) {
          newDropZones.add(id)
        } else {
          newDropZones.delete(id)
        }
        return { ...prev, dropZones: newDropZones }
      })
    },
    clearError: () => setDragState(prev => ({ ...prev, dragError: null }))
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      document.body.classList.remove('dragging')
    }
  }, [])

  if (disabled) {
    return (
      <DragDropContext.Provider value={contextValue}>
        <div className={className}>
          {children}
        </div>
      </DragDropContext.Provider>
    )
  }

  return (
    <DragDropContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={enhancedCollisionDetection}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`${className} ${dragState.isDragging ? 'drag-active' : ''}`}>
          {children}
        </div>
        
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
          style={{
            transformOrigin: '0 0',
          }}
        >
          <DragOverlayContent 
            item={dragState.draggedItem} 
            isValidDrop={dragState.isValidDrop}
            dragError={dragState.dragError}
          />
        </DragOverlay>
      </DndContext>
      
      {/* Global drag state indicator */}
      {dragState.isDragging && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${
              dragState.isValidDrop ? 'bg-green-500' : dragState.dragError ? 'bg-red-500' : 'bg-blue-500'
            }`}></div>
            <span className="font-medium">
              {dragState.isValidDrop ? 'Valid drop zone' : dragState.dragError ? 'Invalid drop' : 'Drag to reorder'}
            </span>
          </div>
        </div>
      )}
      
      {/* Error toast */}
      {dragState.dragError && !dragState.isDragging && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Drag Operation Failed</h4>
              <p className="text-sm text-red-700 mt-1">{dragState.dragError}</p>
            </div>
            <button
              onClick={() => contextValue.clearError()}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </DragDropContext.Provider>
  )
}

// Utility hook for converting workflow steps to drag-drop format
export const useDragDropItems = (steps: WorkflowStepFormData[]): DragDropWorkflowStep[] => {
  return steps.map(step => ({
    ...step,
    dragId: step.id || `step-${step.order}-${Date.now()}`
  }))
}

// Utility function to convert drag-drop items back to workflow steps
export const toDragDropItems = (steps: WorkflowStepFormData[]): DragDropWorkflowStep[] => {
  return steps.map(step => ({
    ...step,
    dragId: step.id || `step-${step.order}-${Date.now()}`
  }))
}

// Utility function to convert drag-drop items back to workflow steps
export const fromDragDropItems = (items: DragDropWorkflowStep[]): WorkflowStepFormData[] => {
  return items.map(({ dragId, ...step }) => step)
}

// Enhanced drop zone indicator with animations
export const DropZoneIndicator: React.FC<{ 
  isActive: boolean
  isValid?: boolean
  position?: 'top' | 'bottom' | 'between'
}> = ({ isActive, isValid = true, position = 'between' }) => {
  if (!isActive) return null

  const baseClasses = "transition-all duration-300 ease-out"
  const positionClasses = {
    top: "h-1 -mt-1 mb-1",
    bottom: "h-1 mt-1 -mb-1",
    between: "h-2 my-1"
  }

  return (
    <div className={`
      ${baseClasses} ${positionClasses[position]} rounded-full relative overflow-hidden
      ${isValid 
        ? 'bg-gradient-to-r from-green-400 to-blue-500 shadow-lg scale-y-150' 
        : 'bg-gradient-to-r from-red-400 to-orange-500 shadow-lg scale-y-125 animate-pulse'
      }
    `}>
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
      
      {/* Drop zone text for larger indicators */}
      {position === 'between' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-sm">
            {isValid ? 'Drop here' : 'Invalid'}
          </span>
        </div>
      )}
    </div>
  )
}

// Enhanced drag placeholder with pulsing animation
export const DragPlaceholder: React.FC<{ 
  isValid?: boolean
  message?: string
}> = ({ isValid = true, message = "Drop here to reorder" }) => (
  <div className={`
    h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300
    ${isValid 
      ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' 
      : 'border-red-300 bg-red-50 hover:bg-red-100'
    }
    animate-pulse
  `}>
    <div className={`flex items-center gap-2 ${isValid ? 'text-blue-600' : 'text-red-600'}`}>
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        {isValid ? (
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        )}
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  </div>
)

// Enhanced drag handle with advanced visual states
export const EnhancedDragHandle: React.FC<{ 
  isDragging?: boolean
  disabled?: boolean
  isOver?: boolean
  isValid?: boolean
}> = ({ isDragging = false, disabled = false, isOver = false, isValid = true }) => {
  if (disabled) return null

  return (
    <div className={`
      relative p-2 rounded-md transition-all duration-200 transform-gpu
      ${isDragging 
        ? isValid
          ? 'bg-green-200 text-green-700 scale-110 shadow-lg' 
          : 'bg-red-200 text-red-700 scale-105 shadow-lg animate-pulse'
        : isOver
        ? 'bg-blue-100 text-blue-600 scale-105'
        : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
    `}>
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 2a2 2 0 100 4 2 2 0 000-4zM7 8a2 2 0 100 4 2 2 0 000-4zM7 14a2 2 0 100 4 2 2 0 000-4zM13 2a2 2 0 100 4 2 2 0 000-4zM13 8a2 2 0 100 4 2 2 0 000-4zM13 14a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      
      {/* Drag state indicator */}
      {isDragging && (
        <div className={`
          absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm
          ${isValid ? 'bg-green-500' : 'bg-red-500'}
        `}>
          <div className={`w-full h-full rounded-full animate-ping ${isValid ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </div>
      )}
    </div>
  )
}

// Enhanced sortable item wrapper with comprehensive visual feedback
export const SortableItem: React.FC<{
  id: string
  children: ReactNode
  disabled?: boolean
  showDropZone?: boolean
}> = ({ id, children, disabled = false, showDropZone = true }) => {
  const { 
    isDragging, 
    activeId, 
    overId, 
    isValidDrop, 
    dragError,
    setDropZone
  } = useDragDrop()
  
  const isBeingDragged = activeId === id
  const isDropTarget = overId === id && isDragging && !isBeingDragged
  const isNearbyItem = isDragging && !isBeingDragged

  // Register/unregister as drop zone
  useEffect(() => {
    if (showDropZone && !disabled) {
      setDropZone(id, true)
      return () => setDropZone(id, false)
    }
  }, [id, showDropZone, disabled, setDropZone])

  return (
    <div className="relative">
      {/* Top drop zone indicator */}
      {showDropZone && isDropTarget && (
        <DropZoneIndicator 
          isActive={true} 
          isValid={isValidDrop}
          position="top"
        />
      )}
      
      <div 
        className={`
          relative transition-all duration-300 ease-out transform-gpu
          ${isBeingDragged 
            ? 'opacity-30 scale-95 rotate-1 z-0' 
            : isDropTarget
            ? isValidDrop
              ? 'scale-102 shadow-lg ring-2 ring-green-300 ring-opacity-60'
              : 'scale-98 shadow-lg ring-2 ring-red-300 ring-opacity-60 animate-pulse'
            : isNearbyItem
            ? 'opacity-80 scale-99'
            : 'opacity-100 scale-100'
          }
          ${disabled ? 'pointer-events-none grayscale' : ''}
        `}
      >
        {/* Background glow effect for drop targets */}
        {isDropTarget && (
          <div className={`
            absolute inset-0 rounded-lg blur-sm -z-10
            ${isValidDrop 
              ? 'bg-green-200 opacity-40' 
              : 'bg-red-200 opacity-40'
            }
          `} />
        )}
        
        {children}
        
        {/* Overlay for invalid drop states */}
        {isDropTarget && !isValidDrop && (
          <div className="absolute inset-0 bg-red-100 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1">
              <span className="text-red-700 text-sm font-medium">
                {dragError || 'Invalid drop location'}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom drop zone indicator */}
      {showDropZone && isDropTarget && (
        <DropZoneIndicator 
          isActive={true} 
          isValid={isValidDrop}
          position="bottom"
        />
      )}
    </div>
  )
}

// Global CSS classes for enhanced drag interactions
export const dragInteractionStyles = `
  .dragging {
    cursor: grabbing !important;
  }
  
  .drag-active {
    user-select: none;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  
  .scale-102 {
    transform: scale(1.02);
  }
  
  .scale-99 {
    transform: scale(0.99);
  }
  
  .scale-98 {
    transform: scale(0.98);
  }
`

// Hook for adding drag interaction styles to document
export const useDragInteractionStyles = () => {
  useEffect(() => {
    const styleId = 'drag-interaction-styles'
    let styleElement = document.getElementById(styleId)
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = dragInteractionStyles
      document.head.appendChild(styleElement)
    }
    
    return () => {
      const element = document.getElementById(styleId)
      if (element && document.head.contains(element)) {
        document.head.removeChild(element)
      }
    }
  }, [])
}

export default DragDropProvider