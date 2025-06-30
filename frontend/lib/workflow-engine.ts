import type { Quote, WorkflowStep, PersonaType } from "@/types/quote"

export class WorkflowEngine {
  static generateWorkflowSteps(quote: Quote): WorkflowStep[] {
    const steps: WorkflowStep[] = []
    let order = 1

    // Always start with Deal Desk
    steps.push({
      id: `step-${order}`,
      quote_id: quote.id,
      persona: "deal_desk",
      name: "Deal Desk Review",
      order: order++,
      status: "pending",
    })

    // Add CRO if discount > 15% or amount > 100k
    if (quote.discount_percent > 15 || quote.total_amount > 100000) {
      steps.push({
        id: `step-${order}`,
        quote_id: quote.id,
        persona: "cro",
        name: "CRO Approval",
        order: order++,
        status: "pending",
      })
    }

    // Always add Legal
    steps.push({
      id: `step-${order}`,
      quote_id: quote.id,
      persona: "legal",
      name: "Legal Review",
      order: order++,
      status: "pending",
    })

    // Add Finance if discount > 40% or custom payment terms
    if (quote.discount_percent > 40 || quote.has_custom_payment_terms) {
      steps.push({
        id: `step-${order}`,
        quote_id: quote.id,
        persona: "finance",
        name: "Finance Review",
        order: order++,
        status: "pending",
      })
    }

    return steps
  }

  static getNextStatus(currentStatus: string, action: string): string {
    const transitions: Record<string, Record<string, string>> = {
      draft: {
        submit: "pending_deal_desk",
        cancel: "cancelled",
      },
      draft_reopened: {
        submit: "pending_deal_desk",
        cancel: "cancelled",
      },
      pending_deal_desk: {
        approve: "pending_cro", // Will be adjusted based on workflow
        reject: "rejected",
        cancel: "cancelled",
      },
      pending_cro: {
        approve: "pending_legal",
        reject: "rejected",
        cancel: "cancelled",
      },
      pending_legal: {
        approve: "pending_finance", // Will be adjusted based on workflow
        reject: "rejected",
        cancel: "cancelled",
      },
      pending_finance: {
        approve: "approved",
        reject: "rejected",
        cancel: "cancelled",
      },
      rejected: {
        reopen: "draft_reopened",
      },
    }

    return transitions[currentStatus]?.[action] || currentStatus
  }

  static canPerformAction(quote: Quote, persona: PersonaType, action: string): boolean {
    // AE can always cancel (until approved) and reopen rejected quotes
    if (persona === "ae") {
      if (action === "cancel" && quote.status !== "approved") return true
      if (action === "reopen" && quote.status === "rejected") return true
      if (action === "submit" && (quote.status === "draft" || quote.status === "draft_reopened")) return true
    }

    // Approvers can approve/reject when it's their turn
    if (action === "approve" || action === "reject") {
      return quote.status === `pending_${persona}`
    }

    return false
  }

  static canEditQuote(quote: Quote, persona: PersonaType): boolean {
    return persona === "ae" && (quote.status === "draft" || quote.status === "draft_reopened")
  }

  static getVisibleQuotes(quotes: Quote[], persona: PersonaType, userId: string): Quote[] {
    if (persona === "ae") {
      // AE sees all quotes they created
      return quotes.filter((q) => q.user_id === userId)
    } else {
      // Other personas see quotes in their queue
      return quotes.filter((q) => q.status === `pending_${persona}`)
    }
  }

  static canApproveStep(quote: Quote, stepOrder: number, allSteps: WorkflowStep[]): boolean {
    // Check if all previous steps are approved
    const previousSteps = allSteps.filter((step) => step.step_order < stepOrder)
    return previousSteps.every((step) => step.status === "approved")
  }

  static handleCascadingRejection(
    steps: WorkflowStep[],
    rejectedStepOrder: number,
    rejectionNotes: string,
  ): WorkflowStep[] {
    return steps.map((step) => {
      if (step.step_order >= rejectedStepOrder) {
        return {
          ...step,
          status: "rejected" as const,
          completedAt: new Date().toISOString(),
          rejection_reason: step.step_order === rejectedStepOrder ? rejectionNotes : "Cascaded rejection from previous step",
        }
      }
      return step
    })
  }
}
