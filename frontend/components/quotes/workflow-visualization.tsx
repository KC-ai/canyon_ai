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
    <div className={isCompact ? "space-y-4" : "space-y-8"}>
      {/* Workflow Steps */}
      <div className="relative">
        {steps.map((step, index) => {
          const Icon = personaIcons[step.persona as keyof typeof personaIcons]
          const StatusIcon = statusConfig[step.status].icon
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
                workflow-step group relative transition-all duration-300
                ${isDragging ? "opacity-50 transform rotate-1 scale-105 z-50" : ""}
                ${isDragOver ? "transform scale-105" : ""}
                ${canDragAndDrop ? "cursor-grab active:cursor-grabbing" : ""}
              `}
              >
                <Card
                  className={`
                border-2 transition-all duration-300 hover:shadow-xl
                ${statusConfig[step.status].bgColor}
                ${statusConfig[step.status].borderColor}
                ${isDragOver ? "border-blue-400 bg-blue-50 shadow-xl" : "hover:border-gray-400"}
                ${step.status === "rejected" ? "border-red-400" : ""}
                ${step.status === "approved" ? "border-green-400" : ""}
              `}
                >
                  <CardContent className={cardPadding}>
                    <div className={`flex items-center justify-between ${spacing}`}>
                      <div className={`flex items-center ${spacing}`}>
                        {canDragAndDrop && !isCompact && (
                          <div className="cursor-grab active:cursor-grabbing flex flex-col gap-1 mr-2">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors"></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors"></div>
                            </div>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors"></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors"></div>
                            </div>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors"></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors"></div>
                            </div>
                          </div>
                        )}

                        <div className={`flex items-center ${isCompact ? "gap-3" : "gap-4"}`}>
                          <div
                            className={`
                          ${isCompact ? "p-3" : "p-4"} rounded-full transition-all duration-300 border-2
                          ${statusConfig[step.status].bgColor}
                          ${statusConfig[step.status].borderColor}
                          ${step.status === "approved" ? "bg-green-100 border-green-400" : ""}
                          ${step.status === "rejected" ? "bg-red-100 border-red-400" : ""}
                          ${step.status === "pending" ? "bg-gray-100 border-gray-400" : ""}
                        `}
                          >
                            <Icon className={iconSize} />
                          </div>

                          <div>
                            <h4 className={`font-bold ${titleSize} text-gray-900`}>{step.name || `${personaLabels[step.persona as keyof typeof personaLabels] || step.persona} Review`}</h4>
                            <p className={`${isCompact ? "text-sm" : "text-base"} text-gray-600 font-medium mt-1`}>
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

                      <div className={`flex items-center ${isCompact ? "gap-2" : "gap-4"}`}>
                        <Badge
                          className={`${statusConfig[step.status].color} font-semibold ${isCompact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"}`}
                        >
                          <StatusIcon className={`${isCompact ? "h-3 w-3" : "h-4 w-4"} mr-1`} />
                          {step.status.replace("_", " ").toUpperCase()}
                        </Badge>

                        {canTakeAction(step) && !isCompact && (
                          <div className="flex gap-3">
                            <Button
                              size="lg"
                              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
                              onClick={() => handleStepAction(step.id, "approve")}
                            >
                              <Check className="h-5 w-5 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="lg"
                              variant="destructive"
                              className="font-semibold px-6"
                              onClick={() => setSelectedAction({ stepId: step.id, action: "reject" })}
                            >
                              <X className="h-5 w-5 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {canEdit && isAccountExecutive && !isCompact && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {(step.comments || step.rejectionNotes) && (
                      <div
                        className={`${isCompact ? "mt-4 p-3" : "mt-6 p-4"} bg-gray-100 rounded-lg border border-gray-200`}
                      >
                        <p className={`${isCompact ? "text-xs" : "text-sm"} font-semibold text-gray-700 mb-2`}>
                          {step.rejectionNotes ? "Rejection Notes:" : "Comments:"}
                        </p>
                        <p className={`${isCompact ? "text-xs" : "text-sm"} text-gray-600`}>
                          {step.rejectionNotes || step.rejection_reason || step.comments}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Connection Arrow */}
              {index < steps.length - 1 && (
                <div className={`flex justify-center ${isCompact ? "py-2" : "py-6"} relative`}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-1 ${isCompact ? "h-3" : "h-6"} bg-gradient-to-b from-gray-300 to-gray-400 rounded-full`}
                    ></div>
                    <div
                      className={`${isCompact ? "p-1" : "p-2"} bg-white border-2 border-gray-300 rounded-full shadow-sm`}
                    >
                      <ArrowDown className={`${isCompact ? "h-3 w-3" : "h-4 w-4"} text-gray-500`} />
                    </div>
                    <div
                      className={`w-1 ${isCompact ? "h-3" : "h-6"} bg-gradient-to-b from-gray-400 to-gray-300 rounded-full`}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Step Button - Only for Account Executive */}
      {canEdit && isAccountExecutive && !showAddStep && !isCompact && (
        <div>
          <Button
            variant="outline"
            className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:border-gray-400 bg-transparent py-8 text-lg font-semibold"
            onClick={() => setShowAddStep(true)}
          >
            <Plus className="h-6 w-6 mr-3" />
            Add Approval Step
          </Button>
        </div>
      )}

      {showAddStep && !isCompact && (
        <div>
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardContent className="p-8">
              <h4 className="text-xl font-bold text-gray-900 mb-6">Add New Approval Step</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(personaLabels)
                  .filter(([key]) => key !== "ae")
                  .map(([key, label]) => {
                    const Icon = personaIcons[key as keyof typeof personaIcons]
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className="justify-start h-auto p-6 bg-transparent hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-400"
                        onClick={() => addNewStep(key)}
                      >
                        <Icon className="h-6 w-6 mr-4" />
                        <span className="font-semibold text-lg">{label}</span>
                      </Button>
                    )
                  })}
              </div>
              <Button
                variant="ghost"
                size="lg"
                className="w-full mt-6 font-semibold"
                onClick={() => setShowAddStep(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rejection Action Panel */}
      {selectedAction && selectedAction.action === "reject" && !isCompact && (
        <div>
          <Card className="border-2 border-red-300 bg-red-50 shadow-lg">
            <CardContent className="p-8">
              <h4 className="text-xl font-bold text-red-900 mb-4">Reject Quote</h4>
              <p className="text-red-700 mb-6 text-lg">
                This will reject the quote and all subsequent approval steps. Please provide a reason for rejection.
              </p>
              <div className="space-y-6">
                <div>
                  <label className="text-base font-semibold text-red-900 mb-3 block">Rejection Reason (Required)</label>
                  <Textarea
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Please explain why you are rejecting this quote..."
                    rows={4}
                    className={`text-base border-2 ${!rejectionNotes.trim() ? "border-red-400" : "border-red-300"} focus:border-red-500`}
                  />
                  {!rejectionNotes.trim() && <p className="text-red-600 text-sm mt-2">Rejection reason is required</p>}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => handleStepAction(selectedAction.stepId, "reject")}
                    disabled={!rejectionNotes.trim()}
                    variant="destructive"
                    size="lg"
                    className="font-semibold px-8"
                  >
                    Confirm Rejection
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-gray-300 hover:border-gray-400 font-semibold px-8 bg-transparent"
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
        </div>
      )}
    </div>
  )
}
