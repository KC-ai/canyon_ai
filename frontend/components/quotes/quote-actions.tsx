"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, RotateCcw, Ban, Send } from "lucide-react"
import type { Quote, PersonaType, WorkflowAction } from "@/types/quote"
import { WorkflowEngine } from "@/lib/workflow-engine"

interface QuoteActionsProps {
  quote: Quote
  currentPersona: PersonaType
  onAction: (action: WorkflowAction, comments?: string) => void
}

export function QuoteActions({ quote, currentPersona, onAction }: QuoteActionsProps) {
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null)
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAction = async (action: WorkflowAction) => {
    if (!WorkflowEngine.canPerformAction(quote, currentPersona, action)) return

    setIsSubmitting(true)
    try {
      await onAction(action, comments)
      setSelectedAction(null)
      setComments("")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAvailableActions = (): Array<{ action: WorkflowAction; label: string; icon: any; variant: any }> => {
    const actions = []

    if (currentPersona === "ae") {
      if (quote.status === "draft" || quote.status === "draft_reopened") {
        actions.push({
          action: "submit" as WorkflowAction,
          label: "Submit for Approval",
          icon: Send,
          variant: "default",
        })
      }
      if (quote.status === "rejected") {
        actions.push({ action: "reopen" as WorkflowAction, label: "Reopen Quote", icon: RotateCcw, variant: "outline" })
      }
      if (quote.status !== "approved" && quote.status !== "cancelled" && quote.status !== "rejected") {
        actions.push({ action: "cancel" as WorkflowAction, label: "Cancel Quote", icon: Ban, variant: "destructive" })
      }
    } else {
      if (quote.status === `pending_${currentPersona}`) {
        actions.push({ action: "approve" as WorkflowAction, label: "Approve", icon: Check, variant: "default" })
        actions.push({ action: "reject" as WorkflowAction, label: "Reject", icon: X, variant: "destructive" })
      }
    }

    return actions
  }

  const availableActions = getAvailableActions()

  if (availableActions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {!selectedAction ? (
        <div className="flex gap-2 flex-wrap">
          {availableActions.map(({ action, label, icon: Icon, variant }) => (
            <Button
              key={action}
              variant={variant}
              size="sm"
              onClick={() => setSelectedAction(action)}
              className={variant === "default" ? "bg-black hover:bg-gray-800" : ""}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      ) : (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedAction === "approve" && "Approve Quote"}
              {selectedAction === "reject" && "Reject Quote"}
              {selectedAction === "submit" && "Submit Quote"}
              {selectedAction === "reopen" && "Reopen Quote"}
              {selectedAction === "cancel" && "Cancel Quote"}
            </CardTitle>
            <CardDescription>
              {selectedAction === "approve" && "This will move the quote to the next approval stage."}
              {selectedAction === "reject" && "This will reject the quote and notify the Account Executive."}
              {selectedAction === "submit" && "This will start the approval workflow."}
              {selectedAction === "reopen" && "This will allow you to edit the quote again."}
              {selectedAction === "cancel" && "This will permanently cancel the quote."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Comments {selectedAction === "reject" ? "(required)" : "(optional)"}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  selectedAction === "approve"
                    ? "Add approval comments..."
                    : selectedAction === "reject"
                      ? "Please explain why you are rejecting this quote..."
                      : "Add comments..."
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleAction(selectedAction)}
                disabled={isSubmitting || (selectedAction === "reject" && !comments.trim())}
                variant={selectedAction === "reject" || selectedAction === "cancel" ? "destructive" : "default"}
                className={
                  selectedAction === "approve" || selectedAction === "submit" ? "bg-black hover:bg-gray-800" : ""
                }
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
