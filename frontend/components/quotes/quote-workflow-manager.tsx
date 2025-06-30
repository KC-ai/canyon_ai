"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Send, Calculator, Ban, Percent, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { WorkflowVisualization } from "./workflow-visualization"
import { QuoteDocumentPreview } from "./quote-document-preview"
import { useToast } from "@/hooks/use-toast"
import { useQuote } from "@/hooks/use-quotes"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from '@tanstack/react-query'

interface QuoteWorkflowManagerProps {
  quoteId: string
}

const personaLabels = {
  ae: "Account Executive",
  deal_desk: "Deal Desk",
  cro: "Chief Revenue Officer",
  legal: "Legal Team",
  finance: "Finance Team",
  customer: "Customer Delivery",
}

// Helper to determine workflow steps based on discount - ensures AE step is always included
const getWorkflowStepsForDiscount = (discountPercent: number) => {
  const steps = [
    {
      id: "step-1",
      name: "Account Executive Review",
      persona: "ae",
      status: "pending" as const, // Will be auto-approved when workflow starts
      order: 1,
    },
    {
      id: "step-2", 
      name: "Deal Desk Review",
      persona: "deal_desk",
      status: "pending" as const,
      order: 2,
    },
  ]

  let order = 3

  // Add CRO for discounts > 15%
  if (discountPercent > 15) {
    steps.push({
      id: `step-${order}`,
      name: "CRO Approval",
      persona: "cro", 
      status: "pending" as const,
      order: order,
    })
    order++
  }

  // Add Finance for discounts > 40%
  if (discountPercent > 40) {
    steps.push({
      id: `step-${order}`,
      name: "Finance Approval",
      persona: "finance",
      status: "pending" as const,
      order: order,
    })
    order++
  }

  // Legal always required
  steps.push({
    id: `step-${order}`,
    name: "Legal Review",
    persona: "legal",
    status: "pending" as const,
    order: order,
  })
  order++

  // Customer delivery final step
  steps.push({
    id: `step-${order}`,
    name: "Customer Delivery",
    persona: "customer",
    status: "pending" as const,
    order: order,
  })

  return steps
}

export function QuoteWorkflowManager({ quoteId }: QuoteWorkflowManagerProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: quote, isLoading, error } = useQuote(quoteId)
  // Initialize with empty array and wait for quote data to load
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([])
  const [isWorkflowStarted, setIsWorkflowStarted] = useState(false)
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)
  const { toast } = useToast()

  // Set workflow steps when quote loads
  useEffect(() => {
    if (quote) {
      const workflowStarted = quote.status !== 'draft' && quote.status !== 'draft_reopened'
      setIsWorkflowStarted(workflowStarted)
      
      if (workflowStarted) {
        // ACTIVE WORKFLOW: Use actual workflow steps from backend (AE should be approved)
        if (quote.workflow_steps && quote.workflow_steps.length > 0) {
          const transformedSteps = quote.workflow_steps.map((step: any) => ({
            id: step.id,
            name: step.name || `${personaLabels[step.persona as keyof typeof personaLabels] || step.persona} Review`,
            persona: step.persona,
            status: step.status, // Keep actual status from backend
            order: step.step_order || step.order,
            assignedAt: step.assigned_at,
            completedAt: step.completed_at || step.approved_at,
            comments: step.comments,
            rejectionNotes: step.rejection_notes || step.rejection_reason
          }))
          setWorkflowSteps(transformedSteps)
        } else {
          // ERROR: Active workflow should ALWAYS have steps from backend
          console.error('ERROR: Active workflow has no steps from backend!', {
            quoteId: quote.id,
            status: quote.status,
            workflowSteps: quote.workflow_steps
          });
          // Don't generate fake steps for active workflows - show empty state
          setWorkflowSteps([])
        }
      } else {
        // DRAFT WORKFLOW: Show preview with all steps pending
        if (quote.workflow_steps && quote.workflow_steps.length > 0) {
          // Use saved draft configuration but show all as pending
          const transformedSteps = quote.workflow_steps.map((step: any) => ({
            id: step.id,
            name: step.name || `${personaLabels[step.persona as keyof typeof personaLabels] || step.persona} Review`,
            persona: step.persona,
            status: 'pending' as const, // All pending in draft preview
            order: step.step_order || step.order,
            assignedAt: step.assigned_at,
            completedAt: step.completed_at || step.approved_at,
            comments: step.comments,
            rejectionNotes: step.rejection_notes || step.rejection_reason
          }))
          setWorkflowSteps(transformedSteps)
        } else {
          // Generate preview workflow with all pending
          const steps = getWorkflowStepsForDiscount(quote.discount_percent || 0)
          // All steps should be pending in preview
          setWorkflowSteps(steps)
        }
      }
    }
  }, [quote])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">Failed to load quote</p>
        <Button onClick={() => router.push('/dashboard/quotes')}>Back to Quotes</Button>
      </div>
    )
  }

  const handleStartWorkflow = async () => {
    try {
      // Submit the quote for approval (backend handles ALL auto-approval logic)
      await apiClient.submitQuote(quoteId)
      
      // Wait a moment for backend to process, then invalidate cache
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Invalidate and refetch quote data to get updated workflow from backend
      await queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
      await queryClient.invalidateQueries({ queryKey: ['quotes'] })
      
      toast({
        title: "Workflow Started", 
        description: "Quote has been submitted for approval and moved to Deal Desk review.",
      })

      // Small delay to allow UI to update, then redirect
      setTimeout(() => {
        router.push("/dashboard/quotes")
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start workflow",
        variant: "destructive",
      })
    }
  }

  const handleStepAction = (stepId: string, action: "approve" | "reject", notes?: string) => {
    // This is only for UI simulation - the actual API calls happen in other components
    // DO NOT call any APIs from here as it causes ID conflicts
    
    // PREVENT AUTOMATIC ACTIONS ON TEMPORARY IDs (step-1, step-2, etc.)
    if (stepId && stepId.toString().startsWith('step-')) {
      console.warn(`Ignoring step action on temporary ID: ${stepId}`)
      return
    }
    
    const updatedSteps = workflowSteps.map((step: any) => {
      if (step.id === stepId) {
        if (action === "approve") {
          return {
            ...step,
            status: "approved" as const,
            completedAt: new Date().toISOString(),
            comments: notes,
          }
        } else {
          return {
            ...step,
            status: "rejected" as const,
            completedAt: new Date().toISOString(),
            rejectionNotes: notes,
          }
        }
      }
      return step
    })

    setWorkflowSteps(updatedSteps)

    // Check if this was the final internal approver (Legal step)
    const finalInternalStep = updatedSteps.find((s: any) => s.persona === "legal")
    if (finalInternalStep?.status === "approved" && action === "approve") {
      // Auto-complete customer delivery step
      const finalSteps = updatedSteps.map((step: any) =>
        step.persona === "customer"
          ? {
              ...step,
              status: "approved" as const,
              completedAt: new Date().toISOString(),
              comments: "Quote sent to customer",
            }
          : step,
      )

      setWorkflowSteps(finalSteps)

      // Show the document preview after a short delay
      setTimeout(() => {
        setShowDocumentPreview(true)
      }, 1000)
    }
  }

  const handleWorkflowUpdate = async (workflow: any) => {
    // Ensure AE step always exists and is first
    let updatedSteps = [...workflow.steps]
    
    // Check if AE step exists
    const aeStepIndex = updatedSteps.findIndex((step: any) => step.persona === 'ae')
    
    if (aeStepIndex === -1) {
      // Add AE step at the beginning
      const aeStep = {
        id: `ae-step-${Date.now()}`,
        name: "Account Executive Review",
        persona: "ae",
        status: "pending" as const,
        order: 1
      }
      updatedSteps.unshift(aeStep)
      
      // Reorder all other steps
      updatedSteps = updatedSteps.map((step: any, index: number) => ({
        ...step,
        order: index + 1
      }))
    } else if (aeStepIndex !== 0) {
      // Move AE step to first position
      const aeStep = updatedSteps.splice(aeStepIndex, 1)[0]
      updatedSteps.unshift(aeStep)
      
      // Reorder all steps
      updatedSteps = updatedSteps.map((step: any, index: number) => ({
        ...step,
        order: index + 1
      }))
    }
    
    // Update local state
    setWorkflowSteps(updatedSteps)
    
    // Save the updated workflow steps to the database
    if (!isWorkflowStarted && quote) {
      try {
        // Transform steps to backend format (only use columns that exist in schema)
        const stepsToSave = updatedSteps.map((step: any) => ({
          id: step.id?.toString().startsWith('ae-step-') ? undefined : step.id, // Don't save temp IDs
          persona: step.persona,
          step_order: step.order,
          status: step.status || 'pending'
          // Note: 'name' column doesn't exist in workflow_steps table
        }))
        
        await apiClient.updateQuoteWorkflow(quoteId, stepsToSave)
        
        toast({
          title: "Workflow Updated",
          description: "Workflow configuration saved successfully. AE step will be auto-approved when workflow starts.",
        })
      } catch (error) {
        console.error('Failed to save workflow configuration:', error)
        toast({
          title: "Error",
          description: "Failed to save workflow configuration",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard/quotes">
            <Button variant="ghost" size="lg" className="hover:bg-white/80">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Quotes
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900">Quote Workflow</h1>
            <p className="text-xl text-gray-600 mt-2">Configure and manage the approval workflow for this quote</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quote Document - 60% width */}
          <Card className="lg:col-span-1 border-2 border-gray-200 shadow-xl bg-white">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-700 text-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
                Quote Document
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Quote Number</p>
                  <p className="text-lg font-bold text-gray-900">{quote.quote_number || `Q-${Math.floor(100000 + Math.random() * 900000)}`}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
                  <p className="text-lg font-semibold text-gray-900">{quote.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Title</p>
                  <p className="text-lg font-semibold text-gray-900">{quote.title}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Amount</p>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-green-100 rounded-full">
                      <Calculator className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">${(quote.total_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Discount</p>
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-orange-100 rounded-full">
                      <Percent className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-lg font-semibold text-orange-600">{quote.discount_percent || 0}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Status</p>
                  <Badge
                    className={`${isWorkflowStarted ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"} font-semibold px-3 py-1`}
                  >
                    <span>{isWorkflowStarted ? "In Progress" : "Draft"}</span>
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-6 border-t border-gray-200">
                {!isWorkflowStarted ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300 hover:border-black hover:bg-gray-50 font-semibold bg-transparent"
                      onClick={() => router.push(`/dashboard/quotes/create?draft=${quoteId}`)}
                    >
                      Update Quote
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full font-semibold border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 bg-transparent"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete quote ${quote.quote_number || quote.id}? This action cannot be undone.`)) {
                          try {
                            await apiClient.deleteQuote(quoteId)
                            toast({
                              title: "Quote Deleted",
                              description: "Quote has been permanently deleted.",
                            })
                            router.push("/dashboard/quotes")
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to delete quote",
                              variant: "destructive",
                            })
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        Delete
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full hover:bg-gray-100 font-semibold"
                      onClick={() => router.push("/dashboard/quotes")}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full font-semibold border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 bg-transparent"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete quote ${quote.quote_number || quote.id}? This action cannot be undone.`)) {
                        try {
                          await apiClient.deleteQuote(quoteId)
                          toast({
                            title: "Quote Deleted",
                            description: "Quote has been permanently deleted.",
                          })
                          router.push("/dashboard/quotes")
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to delete quote",
                            variant: "destructive",
                          })
                        }
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      Delete
                    </div>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Steps - 40% width */}
          <Card className="lg:col-span-1 border-2 border-gray-200 shadow-xl bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Approval Workflow</CardTitle>
                  <CardDescription className="text-blue-100 mt-2">
                    {isWorkflowStarted
                      ? "Track the progress of this quote through the approval process"
                      : "Configure the approval workflow for this quote. Drag and drop to reorder steps."}
                  </CardDescription>
                </div>
                {!isWorkflowStarted && (
                  <Button
                    onClick={handleStartWorkflow}
                    size="lg"
                    className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Start Workflow
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 min-h-[500px] max-h-[800px] overflow-y-auto">
              {/* Workflow visualization */}
              {isLoading || workflowSteps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading workflow configuration...</p>
                </div>
              ) : (
                <WorkflowVisualization
                  workflow={{ id: "workflow-1", steps: workflowSteps }}
                  canEdit={!isWorkflowStarted}
                  currentPersona="ae"
                  onWorkflowUpdate={handleWorkflowUpdate}
                  onStepAction={handleStepAction}
                  compact={false}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quote Document Preview Modal */}
        {showDocumentPreview && (
          <QuoteDocumentPreview
            quote={quote}
            isOpen={showDocumentPreview}
            onClose={() => setShowDocumentPreview(false)}
          />
        )}
      </div>
    </div>
  )
}
