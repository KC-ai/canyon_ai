"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Check,
  Clock,
  X,
  User,
  Building,
  Crown,
  Scale,
  Calculator,
  Users,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowDown,
  GripVertical,
  ChevronDown,
} from "lucide-react"

interface WorkflowStep {
  id: string
  name?: string
  persona: string
  status: "pending" | "in_progress" | "approved" | "rejected"
  order: number // Frontend uses 'order', backend uses 'step_order'
  step_order?: number // Optional backend field
  assignedAt?: string
  completedAt?: string
  approved_at?: string // Backend field
  comments?: string
  rejectionNotes?: string
  rejection_reason?: string // Backend field
}

interface Workflow {
  id: string
  steps: WorkflowStep[]
}

interface WorkflowVisualizationProps {
  workflow: Workflow
  canEdit?: boolean
  currentPersona?: string
  onWorkflowUpdate?: (workflow: Workflow) => void
  onStepAction?: (stepId: string, action: "approve" | "reject", notes?: string) => void
  compact?: boolean
}

const personaIcons = {
  ae: User,
  deal_desk: Building,
  cro: Crown,
  legal: Scale,
  finance: Calculator,
  customer: Users,
}

const personaLabels = {
  ae: "Account Executive",
  deal_desk: "Deal Desk",
  cro: "Chief Revenue Officer",
  legal: "Legal Team",
  finance: "Finance Team",
  customer: "Customer",
}

const statusConfig = {
  pending: {
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: Clock,
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
  },
  in_progress: {
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: AlertCircle,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
  },
  approved: {
    color: "bg-green-100 text-green-800 border-green-300",
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
  },
  rejected: {
    color: "bg-red-100 text-red-800 border-red-300",
    icon: XCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
  },
}

export function WorkflowVisualization({
  workflow,
  canEdit = false,
  currentPersona = "ae",
  onWorkflowUpdate,
  onStepAction,
  compact = false,
}: WorkflowVisualizationProps) {
  // SAFETY: Ensure we never render action buttons in compact mode
  const [isCompact] = useState(compact);
  
  const [steps, setSteps] = useState(workflow.steps)
  const [draggedStep, setDraggedStep] = useState<string | null>(null)
  const [dragOverStep, setDragOverStep] = useState<string | null>(null)
  const [showAddStep, setShowAddStep] = useState(false)
  const [selectedAction, setSelectedAction] = useState<{ stepId: string; action: "approve" | "reject" } | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState("")
  const dragCounter = useRef(0)
  
  // Update steps when workflow prop changes
  React.useEffect(() => {
    console.log('WorkflowVisualization - Updating steps from workflow prop:', {
      workflowId: workflow.id,
      stepsCount: workflow.steps?.length || 0,
      steps: workflow.steps
    });
    if (workflow.steps && workflow.steps.length > 0) {
      setSteps(workflow.steps);
    }
  }, [workflow.id, JSON.stringify(workflow.steps)]);

  const isAccountExecutive = currentPersona === "ae"
  const canDragAndDrop = canEdit && isAccountExecutive

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    if (!canDragAndDrop) return
    setDraggedStep(stepId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", stepId)
  }

  const handleDragEnter = (e: React.DragEvent, stepId: string) => {
    e.preventDefault()
    dragCounter.current++
    if (draggedStep && draggedStep !== stepId) {
      setDragOverStep(stepId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOverStep(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetStepId: string) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragOverStep(null)

    if (!draggedStep || draggedStep === targetStepId) {
      setDraggedStep(null)
      return
    }

    const draggedStepData = steps.find((s: WorkflowStep) => s.id === draggedStep)
    const targetStepData = steps.find((s: WorkflowStep) => s.id === targetStepId)

    if (!draggedStepData || !targetStepData) {
      setDraggedStep(null)
      return
    }

    const newSteps = [...steps]
    const draggedIndex = newSteps.findIndex((s) => s.id === draggedStep)
    const targetIndex = newSteps.findIndex((s) => s.id === targetStepId)

    const [removed] = newSteps.splice(draggedIndex, 1)
    newSteps.splice(targetIndex, 0, removed)

    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index + 1,
    }))

    setSteps(updatedSteps)
    setDraggedStep(null)

    if (onWorkflowUpdate) {
      onWorkflowUpdate({ ...workflow, steps: updatedSteps })
    }
  }

  const canTakeAction = (step: WorkflowStep) => {
    if (isAccountExecutive) return false

    if (step.status !== "pending" || step.persona !== currentPersona) return false

    const currentStepIndex = steps.findIndex((s: WorkflowStep) => s.id === step.id)
    const previousSteps = steps.slice(0, currentStepIndex)
    const allPreviousApproved = previousSteps.every((s: WorkflowStep) => s.status === "approved")

    return allPreviousApproved
  }

  const handleStepAction = async (stepId: string, action: "approve" | "reject") => {
    if (action === "reject" && !rejectionNotes.trim()) {
      return
    }

    // PREVENT AUTOMATIC ACTIONS ON TEMPORARY IDs (step-1, step-2, etc.)
    if (stepId && stepId.toString().startsWith('step-')) {
      console.warn(`Ignoring step action on temporary ID: ${stepId}`)
      return
    }

    // Only update local UI state - DO NOT make API calls here
    // API calls are handled by parent components to avoid ID conflicts
    let updatedSteps = [...steps]
    const stepIndex = updatedSteps.findIndex((s) => s.id === stepId)

    if (action === "reject") {
      updatedSteps = updatedSteps.map((step, index) => {
        if (index >= stepIndex) {
          return {
            ...step,
            status: "rejected" as const,
            completedAt: new Date().toISOString(),
            rejectionNotes: index === stepIndex ? rejectionNotes : "Cascaded rejection from previous step",
          }
        }
        return step
      })
    } else {
      updatedSteps = updatedSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: "approved" as const,
              completedAt: new Date().toISOString(),
              comments: rejectionNotes || undefined,
            }
          : step,
      )
    }

    setSteps(updatedSteps)
    setSelectedAction(null)
    setRejectionNotes("")

    // Notify parent component for any additional handling
    if (onStepAction) {
      onStepAction(stepId, action, rejectionNotes)
    }
  }

  const addNewStep = (persona: string) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name: `${personaLabels[persona as keyof typeof personaLabels]} Review`,
      persona,
      status: "pending",
      order: steps.length + 1,
    }
    const updatedSteps = [...steps, newStep]
    setSteps(updatedSteps)
    setShowAddStep(false)

    if (onWorkflowUpdate) {
      onWorkflowUpdate({ ...workflow, steps: updatedSteps })
    }
  }

  const removeStep = (stepId: string) => {
    const filteredSteps = steps.filter((step) => step.id !== stepId)
    const reorderedSteps = filteredSteps.map((step, index) => ({
      ...step,
      order: index + 1,
    }))
    setSteps(reorderedSteps)

    if (onWorkflowUpdate) {
      onWorkflowUpdate({ ...workflow, steps: reorderedSteps })
    }
  }

  const cardPadding = isCompact ? "p-4" : "p-8"
  const iconSize = isCompact ? "h-6 w-6" : "h-8 w-8"
  const titleSize = isCompact ? "text-lg" : "text-2xl"
  const spacing = isCompact ? "gap-4" : "gap-6"

  // Workflow visualization component rendering
  
  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No workflow steps configured. This should not happen!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Workflow Steps */}
      <div className="relative">
        {steps.map((step, index) => {
          const Icon = personaIcons[step.persona as keyof typeof personaIcons] || User
          const statusCfg = statusConfig[step.status as keyof typeof statusConfig] || statusConfig.pending
          const StatusIcon = statusCfg.icon
          const isDragging = draggedStep === step.id
          const isDragOver = dragOverStep === step.id

          return (
            <div key={step.id} className="relative">
              <div
                draggable={canDragAndDrop}
                onDragStart={(e) => handleDragStart(e, step.id)}
                onDragEnter={(e) => handleDragEnter(e, step.id)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, step.id)}
                className={`
                  workflow-step group relative transition-all duration-200
                  ${isDragging ? "opacity-50 transform rotate-1 scale-105 z-50" : ""}
                  ${isDragOver ? "transform scale-105" : ""}
                  ${canDragAndDrop ? "cursor-grab active:cursor-grabbing" : ""}
                `}
              >
                <Card
                  className={`
                  border-2 transition-all duration-200 hover:shadow-lg
                  ${statusCfg.bgColor}
                  ${isDragOver ? "border-blue-400 bg-blue-50 shadow-lg" : "border-gray-200 hover:border-gray-300"}
                  ${step.status === "rejected" ? "border-red-300" : ""}
                  ${step.status === "approved" ? "border-green-300" : ""}
                `}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {canDragAndDrop && (
                          <div className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <div
                            className={`
                            p-3 rounded-full transition-colors border-2
                            ${statusCfg.bgColor}
                            ${step.status === "approved" ? "border-green-300" : ""}
                            ${step.status === "rejected" ? "border-red-300" : ""}
                            ${step.status === "pending" ? "border-gray-300" : ""}
                          `}
                          >
                            <Icon className="h-6 w-6 text-gray-700" />
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 text-lg">{step.name || `${personaLabels[step.persona as keyof typeof personaLabels] || step.persona} Review`}</h4>
                            <p className="text-sm text-gray-600 font-medium">
                              {personaLabels[step.persona as keyof typeof personaLabels]}
                            </p>
                            {(step.completedAt || step.approved_at) && (
                              <p className="text-xs text-gray-500 mt-1">
                                Completed {new Date(step.completedAt || step.approved_at || '').toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={`${statusCfg.color} font-medium px-3 py-1`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {step.status.replace("_", " ").toUpperCase()}
                        </Badge>

                        {canTakeAction(step) && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleStepAction(step.id, "approve")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedAction({ stepId: step.id, action: "reject" })}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {canEdit && isAccountExecutive && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-red-600"
                              onClick={() => removeStep(step.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {(step.comments || step.rejectionNotes || step.rejection_reason) && (
                      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                                                  <p className="text-sm text-gray-700 font-medium">
                            {(step.rejectionNotes || step.rejection_reason) ? "Rejection Notes:" : "Comments:"}
                          </p>
                        <p className="text-sm text-gray-600 mt-1">{step.rejectionNotes || step.rejection_reason || step.comments}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Connection Arrow */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-3 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-4 bg-gradient-to-b from-gray-300 to-gray-400"></div>
                    <div className="p-1 bg-white border-2 border-gray-300 rounded-full">
                      <ChevronDown className="h-3 w-3 text-gray-500" />
                    </div>
                    <div className="w-0.5 h-4 bg-gradient-to-b from-gray-400 to-gray-300"></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Step Button - Only for Account Executive */}
      {canEdit && isAccountExecutive && !showAddStep && (
        <Button
          variant="outline"
          className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:border-gray-400 bg-transparent py-6"
          onClick={() => setShowAddStep(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Approval Step
        </Button>
      )}

      {showAddStep && (
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Approval Step</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(personaLabels)
                .filter(([key]) => key !== "ae") // Don't allow adding AE as approver
                .map(([key, label]) => {
                  const Icon = personaIcons[key as keyof typeof personaIcons]
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      className="justify-start h-auto p-4 bg-transparent hover:bg-gray-50"
                      onClick={() => addNewStep(key)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <span className="font-medium">{label}</span>
                    </Button>
                  )
                })}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setShowAddStep(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rejection Action Panel */}
      {selectedAction && selectedAction.action === "reject" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Reject Quote</h4>
            <p className="text-sm text-gray-600 mb-4">
              This will reject the quote and all subsequent approval steps. Please provide a reason for rejection.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Rejection Reason (Required)</label>
                <Textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Please explain why you are rejecting this quote..."
                  rows={3}
                  className={!rejectionNotes.trim() ? "border-red-300" : ""}
                />
                {!rejectionNotes.trim() && <p className="text-red-600 text-sm mt-1">Rejection reason is required</p>}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleStepAction(selectedAction.stepId, "reject")}
                  disabled={!rejectionNotes.trim()}
                  variant="destructive"
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAction(null)
                    setRejectionNotes("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
