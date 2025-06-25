import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  WorkflowStep,
  ApprovalWorkflow,
  WorkflowStepCardProps,
  DragDropWorkflowStep
} from '../../types/workflows'
import WorkflowStepCard from './WorkflowStepCard'
import { 
  useDragDrop, 
  EnhancedDragHandle, 
  SortableItem,
  DropZoneIndicator,
  useDragInteractionStyles
} from './DragDropProvider'

// Props for sortable step card
interface SortableWorkflowStepCardProps extends Omit<WorkflowStepCardProps, 'step'> {
  step: DragDropWorkflowStep
  disabled?: boolean
}

// Enhanced sortable wrapper for WorkflowStepCard with comprehensive drag interactions
const SortableWorkflowStepCard: React.FC<SortableWorkflowStepCardProps> = ({
  step,
  workflow,
  onApprove,
  onReject,
  onEscalate,
  readonly = false,
  showActions = true,
  disabled = false
}) => {
  // Add drag interaction styles
  useDragInteractionStyles()
  
  const { 
    isDragging, 
    activeId, 
    overId, 
    isValidDrop, 
    dragError 
  } = useDragDrop()
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
    isSorting,
    isOver
  } = useSortable({
    id: step.dragId,
    disabled: disabled || readonly
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  }

  // Enhanced drag states
  const isBeingDragged = activeId === step.dragId
  const isDropTarget = overId === step.dragId && isDragging && !isBeingDragged
  const isNearbyItem = isDragging && !isBeingDragged

  // Convert DragDropWorkflowStep back to WorkflowStep for the card
  const workflowStep: WorkflowStep = {
    id: step.id || step.dragId,
    workflow_id: workflow.id,
    name: step.name,
    description: step.description,
    persona: step.persona,
    order: step.order,
    is_required: step.is_required,
    auto_approve_threshold: step.auto_approve_threshold,
    escalation_threshold: step.escalation_threshold,
    max_processing_days: step.max_processing_days,
    status: 'pending' as any, // This would come from the actual workflow step
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return (
    <SortableItem
      id={step.dragId}
      disabled={disabled}
      showDropZone={!readonly && !disabled}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={`
          relative transition-all duration-300 ease-out transform-gpu
          ${isItemDragging ? 'z-50 rotate-2 shadow-2xl scale-105' : ''}
          ${isSorting ? 'z-40' : 'z-auto'}
        `}
      >
        {/* Enhanced card wrapper with drag feedback */}
        <div className={`
          relative rounded-lg overflow-hidden
          ${isItemDragging 
            ? 'ring-4 ring-blue-300 ring-opacity-60 shadow-2xl' 
            : isDropTarget
            ? isValidDrop
              ? 'ring-2 ring-green-400 ring-opacity-40 shadow-lg'
              : 'ring-2 ring-red-400 ring-opacity-40 shadow-lg'
            : isNearbyItem
            ? 'shadow-md'
            : 'shadow-sm'
          }
        `}>
          {/* Drag handle overlay with enhanced positioning */}
          {!readonly && !disabled && (
            <div 
              className={`
                absolute left-3 top-3 z-20 transition-all duration-200
                ${isItemDragging ? 'scale-110' : ''}
              `}
              {...attributes}
              {...listeners}
            >
              <EnhancedDragHandle 
                isDragging={isItemDragging}
                disabled={disabled || readonly}
                isOver={isOver}
                isValid={isValidDrop}
              />
            </div>
          )}
          
          {/* Drag state overlay */}
          {isItemDragging && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-30 z-10 pointer-events-none rounded-lg">
              <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                Dragging Step {step.order}
              </div>
            </div>
          )}
          
          {/* Main card content with enhanced spacing */}
          <div className={`
            transition-all duration-200
            ${!readonly && !disabled ? 'pl-14' : ''}
            ${isItemDragging ? 'opacity-90' : ''}
          `}>
            <WorkflowStepCard
              step={workflowStep}
              workflow={workflow}
              onApprove={onApprove}
              onReject={onReject}
              onEscalate={onEscalate}
              readonly={readonly}
              showActions={showActions}
            />
          </div>
          
          {/* Border glow effect */}
          {isDropTarget && (
            <div className={`
              absolute inset-0 rounded-lg pointer-events-none
              ${isValidDrop 
                ? 'shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                : 'shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              }
            `} />
          )}
        </div>
        
        {/* Step position indicator during drag */}
        {isItemDragging && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
            Moving to position...
          </div>
        )}
      </div>
    </SortableItem>
  )
}

export default SortableWorkflowStepCard