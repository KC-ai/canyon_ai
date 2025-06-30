"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, Clock, RotateCcw, Ban, Loader2, User, RefreshCw } from "lucide-react"
import { WorkflowVisualization } from "./workflow-visualization"
import { QuoteStatusPill } from "./quote-status-pill"
import { QuoteSentModal } from "./quote-sent-modal"
import type { Quote, PersonaType } from "@/types/quote"
import { apiClient } from '@/lib/api-client'
import { useWorkflowActions, useQuote } from '@/hooks/use-quotes'

interface QuoteDetailModalProps {
  quote: Quote | null
  isOpen: boolean
  onClose: () => void
  currentPersona: PersonaType
  onQuoteAction: (quoteId: string, action: string, comments?: string) => void
}


const personaLabels = {
  ae: "Account Executive",
  deal_desk: "Deal Desk",
  cro: "Chief Revenue Officer",
  legal: "Legal Team",
  finance: "Finance Team",
  customer: "Customer Delivery",
}

// Workflow data will come from the quote object

export function QuoteDetailModal({ quote: initialQuote, isOpen, onClose, currentPersona, onQuoteAction }: QuoteDetailModalProps) {
  const [selectedAction, setSelectedAction] = useState<"approve" | "reject" | null>(null)
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showQuoteSentModal, setShowQuoteSentModal] = useState(false)
  const [quoteSentToCustomer, setQuoteSentToCustomer] = useState<Quote | null>(null)
  const workflowActions = useWorkflowActions()
  
  // Fetch full quote data with workflow when modal opens
  const { data: fullQuote, isLoading: isLoadingQuote, refetch } = useQuote(initialQuote?.id || '', !isOpen)
  
  // Always use full quote data when available (which includes workflow steps)
  // Don't fall back to initial quote which doesn't have workflow data
  const quote = fullQuote || (isLoadingQuote ? null : initialQuote)
  
  // Refetch when modal opens to ensure latest data
  useEffect(() => {
    if (isOpen && initialQuote?.id) {
      console.log('Quote Detail Modal - Refetching quote data for:', initialQuote.id);
      refetch();
    }
  }, [isOpen, initialQuote?.id, refetch]);
  
  // Debug logging
  useEffect(() => {
    console.log('Quote Detail Modal - Data status:', {
      modalIsOpen: isOpen,
      initialQuoteId: initialQuote?.id,
      initialQuoteStatus: initialQuote?.status,
      fullQuoteId: fullQuote?.id,
      fullQuoteStatus: fullQuote?.status,
      fullQuoteHasWorkflowSteps: !!(fullQuote?.workflow_steps),
      workflowStepsCount: fullQuote?.workflow_steps?.length || 0,
      isLoadingQuote,
      usingFullQuote: !!fullQuote,
      usingInitialQuote: !fullQuote && !!initialQuote
    });
  }, [isOpen, initialQuote, fullQuote, isLoadingQuote, quote?.workflow_steps, quote?.id, quote?.status]);
  
  // Log if we detect temporary IDs in workflow steps
  useEffect(() => {
    if (quote?.workflow_steps) {
      const hasTemporaryIds = quote.workflow_steps.some((step: any) => 
        step.id && step.id.toString().startsWith('step-')
      );
      if (hasTemporaryIds) {
        console.error('ERROR: Quote has workflow steps with temporary IDs!', {
          quoteId: quote.id,
          status: quote.status,
          steps: quote.workflow_steps.map((s: any) => ({ id: s.id, persona: s.persona }))
        });
      }
    }
  }, [quote?.workflow_steps]);

  if (!quote && !isLoadingQuote) return null

  const canTakeAction = () => {
    return quote && currentPersona !== "ae" && quote.status === `pending_${currentPersona}`
  }

  const canManageRejectedQuote = () => {
    return quote && currentPersona === "ae" && quote.status === "rejected"
  }

  const handleAction = async (action: "approve" | "reject") => {
    console.log('Quote Detail Modal - handleAction called:', { action, quoteId: quote?.id, currentPersona });
    
    if (action === "reject" && !comments.trim()) {
      return // Require comments for rejection
    }

    setIsSubmitting(true)
    try {
      // Find the current workflow step that needs action
      const workflowSteps = quote?.workflow_steps || []
      const currentStep = workflowSteps.find(
        (step: any) => step.persona === currentPersona && step.status === "pending"
      )
      
      console.log('Quote Detail Modal - Current step for action:', {
        step: currentStep,
        currentPersona,
        action,
        quoteStatus: quote.status
      });
      
      if (currentStep) {
        // SAFETY CHECK: Don't approve temporary IDs
        if (currentStep.id && currentStep.id.toString().startsWith('step-')) {
          console.error('Quote Detail Modal - Refusing to approve temporary step ID:', currentStep.id);
          throw new Error('Cannot approve step with temporary ID');
        }
        
        // Check if this will be the last internal approval BEFORE making the API call
        let isLastInternalApproval = false
        if (action === "approve") {
          const customerStep = workflowSteps.find((s: any) => s.persona === 'customer')
          const nonCustomerSteps = workflowSteps.filter((s: any) => s.persona !== 'customer')
          const pendingInternalSteps = nonCustomerSteps.filter((s: any) => 
            s.status === 'pending' && s.id !== currentStep.id
          )
          isLastInternalApproval = pendingInternalSteps.length === 0 && !!customerStep
          
          console.log('Quote Detail Modal - Pre-approval check:', {
            currentStepPersona: currentStep.persona,
            currentStepId: currentStep.id,
            allWorkflowSteps: workflowSteps.map((s: any) => ({ 
              id: s.id, 
              persona: s.persona, 
              status: s.status 
            })),
            customerStep: customerStep ? { 
              id: customerStep.id, 
              persona: customerStep.persona, 
              status: customerStep.status 
            } : null,
            nonCustomerSteps: nonCustomerSteps.map((s: any) => ({ 
              id: s.id, 
              persona: s.persona, 
              status: s.status 
            })),
            pendingInternalSteps: pendingInternalSteps.map((s: any) => ({ 
              id: s.id, 
              persona: s.persona, 
              status: s.status 
            })),
            pendingInternalStepsCount: pendingInternalSteps.length,
            isLastInternalApproval
          })
        }
        
        if (action === "approve") {
          await workflowActions.approve.mutateAsync({ 
            stepId: currentStep.id, 
            quoteId: quote.id,
            comments: comments || undefined 
          })
        } else {
          await workflowActions.reject.mutateAsync({ 
            stepId: currentStep.id, 
            quoteId: quote.id,
            reason: comments 
          })
        }
        
        // Also call the parent's action handler for UI updates
        await onQuoteAction(quote.id, action, comments)
        
        // If this was the last internal approval, wait and show the modal
        if (isLastInternalApproval) {
          console.log('Quote Detail Modal - Last internal approval completed, waiting for auto-approval...')
          
          // Wait for backend to complete auto-approval
          setTimeout(async () => {
            console.log('Quote Detail Modal - Checking quote status after delay...')
            const finalQuote = await refetch()
            console.log('Quote Detail Modal - Refetch result:', {
              hasData: !!finalQuote?.data,
              quoteId: finalQuote?.data?.id,
              quoteStatus: finalQuote?.data?.status,
              workflowStepsCount: finalQuote?.data?.workflow_steps?.length || 0,
              customerStep: finalQuote?.data?.workflow_steps?.find((s: any) => s.persona === 'customer')
            })
            
            if (finalQuote?.data && finalQuote.data.status === 'approved') {
              console.log('Quote Detail Modal - Quote approved! Showing sent modal.')
              setQuoteSentToCustomer(finalQuote.data)
              setShowQuoteSentModal(true)
              onClose()
            } else {
              console.log('Quote Detail Modal - Quote not yet approved, status:', finalQuote?.data?.status)
            }
          }, 2000) // Wait 2 seconds
          
          setSelectedAction(null)
          setComments("")
          return
        }
      }
      
      // Alternative approach: After ANY approval, poll for status change
      if (action === "approve") {
        console.log('Quote Detail Modal - Starting to poll for quote approval...')
        
        // Poll for up to 10 seconds
        let attempts = 0
        const maxAttempts = 10
        const pollInterval = 1000 // 1 second
        
        const checkApprovalStatus = async () => {
          attempts++
          console.log(`Quote Detail Modal - Polling attempt ${attempts}/${maxAttempts}...`)
          
          const updatedQuote = await refetch()
          const status = updatedQuote?.data?.status
          
          console.log('Quote Detail Modal - Poll result:', {
            attempt: attempts,
            quoteId: updatedQuote?.data?.id,
            status: status,
            isApproved: status === 'approved'
          })
          
          if (status === 'approved') {
            console.log('Quote Detail Modal - Quote is now approved! Showing sent modal.')
            setQuoteSentToCustomer(updatedQuote.data)
            setShowQuoteSentModal(true)
            setSelectedAction(null)
            setComments("")
            onClose()
            return true
          }
          
          if (attempts < maxAttempts) {
            // Continue polling
            setTimeout(checkApprovalStatus, pollInterval)
          } else {
            console.log('Quote Detail Modal - Polling timed out, quote not approved yet.')
            // Just close normally
            setSelectedAction(null)
            setComments("")
            setTimeout(() => onClose(), 500)
          }
          
          return false
        }
        
        // Start polling after a short delay
        setTimeout(checkApprovalStatus, 500)
        return
      }
      
      setSelectedAction(null)
      setComments("")
      // Don't close immediately - let the user see the updated status
      setTimeout(() => {
        onClose()
      }, 500)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectedQuoteAction = async (action: "reopen" | "cancel") => {
    setIsSubmitting(true)
    try {
      await onQuoteAction(quote!.id, action)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Quote Details</DialogTitle>
          </DialogHeader>
          {isLoadingQuote || !quote ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">
                  {quote.quote_number} - {quote.customer_name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoadingQuote}
                  className="ml-4"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingQuote ? 'animate-spin' : ''}`} />
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workflow">Approval Workflow</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quote Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Quote Details
                  <QuoteStatusPill status={quote.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Customer</p>
                    <p className="font-semibold">{quote.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Amount</p>
                    <p className="font-semibold text-lg">{formatCurrency(quote.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Discount</p>
                    <p className="font-semibold">{quote.discount_percent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Owner</p>
                    <p className="font-semibold">{quote.owner}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Description</p>
                  <p className="text-gray-900">{quote.description || "No description provided"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-medium">Created</p>
                    <p>{formatDate(quote.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Last Updated</p>
                    <p>{formatDate(quote.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Panel for Approvers */}
            {canTakeAction() && (
              <Card>
                <CardHeader>
                  <CardTitle>Required Action</CardTitle>
                  <CardDescription>This quote requires your approval to proceed to the next stage.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedAction ? (
                    <div className="flex gap-3">
                      <Button onClick={() => setSelectedAction("approve")} className="bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="destructive" onClick={() => setSelectedAction("reject")}>
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          {selectedAction === "reject" ? "Rejection Reason (Required)" : "Comments (Optional)"}
                        </label>
                        <Textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder={
                            selectedAction === "reject"
                              ? "Please explain why you are rejecting this quote..."
                              : "Add any comments about your decision..."
                          }
                          rows={3}
                          className={selectedAction === "reject" && !comments.trim() ? "border-red-300" : ""}
                        />
                        {selectedAction === "reject" && !comments.trim() && (
                          <p className="text-red-600 text-sm mt-1">Rejection reason is required</p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleAction(selectedAction)}
                          disabled={isSubmitting || (selectedAction === "reject" && !comments.trim())}
                          className={selectedAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                          variant={selectedAction === "reject" ? "destructive" : "default"}
                        >
                          {isSubmitting ? "Processing..." : `Confirm ${selectedAction}`}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedAction(null)
                            setComments("")
                          }}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Panel for Rejected Quotes (AE only) */}
            {canManageRejectedQuote() && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800">Quote Rejected</CardTitle>
                  <CardDescription className="text-red-700">
                    This quote has been rejected. You can reopen it for editing or cancel it permanently.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleRejectedQuoteAction("reopen")}
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reopen Quote
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectedQuoteAction("cancel")}
                      disabled={isSubmitting}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Approval Workflow</CardTitle>
                <CardDescription>Track the progress of this quote through the approval process</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {(() => {
                  // Only show workflow if we have the full quote data (not the initial quote from list)
                  if (!fullQuote) {
                    return (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    );
                  }
                  
                  // Always use workflow steps from the quote if available
                  const workflowSteps = quote?.workflow_steps || [];
                  
                  // For draft quotes with no steps, show message
                  if (workflowSteps.length === 0 && (quote?.status === 'draft' || quote?.status === 'draft_reopened')) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p>Workflow will be created when the quote is submitted for approval.</p>
                      </div>
                    );
                  }
                  
                  // Check if quote has been submitted (non-draft status)
                  const isSubmitted = quote?.status !== 'draft' && quote?.status !== 'draft_reopened';
                  
                  // For non-draft quotes without workflow steps, show error
                  if (isSubmitted && workflowSteps.length === 0) {
                    return (
                      <div className="text-center py-8 text-red-500">
                        <p>Error: No workflow steps found for submitted quote.</p>
                        <p className="text-sm text-gray-500 mt-2">This quote may need to be resubmitted.</p>
                      </div>
                    );
                  }
                  
                  // Show workflow visualization if we have steps
                  if (workflowSteps.length > 0) {
                    // Sort steps by order and transform them
                    const sortedSteps = [...workflowSteps].sort((a: any, b: any) => {
                      const orderA = a.step_order || a.order || 0;
                      const orderB = b.step_order || b.order || 0;
                      return orderA - orderB;
                    });
                    
                    console.log('Quote Detail Modal - Workflow Data:', {
                      quoteId: quote?.id,
                      quoteStatus: quote?.status,
                      workflowStepsRaw: workflowSteps,
                      sortedSteps: sortedSteps,
                      firstStep: sortedSteps[0],
                      isFullQuoteData: !!fullQuote,
                      isInitialQuoteData: !fullQuote && !!initialQuote
                    });
                    
                    return (
                      <WorkflowVisualization
                        workflow={{ 
                          id: `workflow-${quote?.id}`, 
                          steps: sortedSteps.map((step: any) => {
                            // SAFETY CHECK: Ensure we're not passing temporary IDs
                            if (step.id && step.id.toString().startsWith('step-')) {
                              console.error('Warning: Workflow step has temporary ID:', step.id);
                            }
                            return {
                              id: step.id,
                              name: step.name || `${personaLabels[step.persona as keyof typeof personaLabels] || step.persona} Review`,
                              persona: step.persona,
                              status: step.status,
                              order: step.step_order || step.order || 0,
                              assignedAt: step.assigned_at,
                              completedAt: step.completed_at || step.approved_at,
                              comments: step.comments,
                              rejectionNotes: step.rejection_notes || step.rejection_reason
                            };
                          })
                      }}
                      canEdit={false}
                      currentPersona={currentPersona}
                      onWorkflowUpdate={async (workflow: any) => {
                        // Save workflow changes if quote is in draft
                        if (quote?.status === 'draft' || quote?.status === 'draft_reopened') {
                          try {
                            await apiClient.updateQuoteWorkflow(quote.id, workflow.steps)
                            console.log('Workflow saved successfully')
                          } catch (error) {
                            console.error('Failed to save workflow:', error)
                          }
                        }
                      }}
                      onStepAction={(stepId, action, notes) => {
                        console.log(`Step ${stepId}: ${action}`, notes)
                        // DO NOT make any API calls here - this is just for logging
                      }}
                      compact={true}
                    />
                    );
                  } else {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p>No workflow steps found. This may be an error.</p>
                      </div>
                    );
                  }
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>Complete timeline of actions taken on this quote</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Quote approved by Deal Desk</p>
                      <p className="text-sm text-gray-600">Pricing looks good, approved for next stage.</p>
                      <p className="text-xs text-gray-500 mt-1">Jan 15, 2024 at 2:30 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Quote submitted for approval</p>
                      <p className="text-sm text-gray-600">Sent to Deal Desk for initial review</p>
                      <p className="text-xs text-gray-500 mt-1">Jan 15, 2024 at 10:00 AM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Quote created</p>
                      <p className="text-sm text-gray-600">Initial quote created by John Doe</p>
                      <p className="text-xs text-gray-500 mt-1">Jan 15, 2024 at 9:30 AM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quote Sent Modal */}
      <QuoteSentModal
        quote={quoteSentToCustomer}
        isOpen={showQuoteSentModal}
        onClose={() => {
          setShowQuoteSentModal(false)
          setQuoteSentToCustomer(null)
        }}
      />
    </>
  )
}
