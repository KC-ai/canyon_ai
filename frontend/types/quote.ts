export type QuoteStatus =
  | "draft"
  | "draft_reopened"
  | "pending_deal_desk"
  | "pending_cro"
  | "pending_legal"
  | "pending_finance"
  | "approved"
  | "rejected"
  | "terminated"

export type PersonaType = "ae" | "deal_desk" | "cro" | "legal" | "finance"

export type WorkflowAction = "submit" | "approve" | "reject" | "reopen" | "cancel"

export interface Quote {
  id: string
  quote_number: string
  customer_name: string
  customer_email?: string
  title: string
  description?: string
  status: QuoteStatus
  current_stage?: PersonaType  // Added by backend for filtering
  total_amount: number
  discount_percent: number
  user_id: string  // Backend has user_id, not created_by
  owner?: string  // Make owner optional since backend doesn't have it
  created_at: string
  updated_at: string
  items: QuoteItem[]
  submitted_at?: string
  approved_at?: string
  rejected_at?: string
  terminated_at?: string  // Backend uses terminated_at
  workflow_steps?: WorkflowStep[]
  current_step?: WorkflowStep  // Backend includes current_step in QuoteWithWorkflow
}

export interface QuoteItem {
  id: string
  quote_id: string
  name: string
  description?: string
  quantity: number
  unit_price: number
  discount_percent: number
  total_price: number
}

export interface WorkflowStep {
  id: string
  quote_id: string
  persona: PersonaType
  name?: string // Optional since it's not in DB
  step_order: number // Match backend field name
  status: "pending" | "approved" | "rejected" | "skipped"
  assigned_at?: string
  assigned_to?: string
  approved_at?: string // Backend uses approved_at
  approved_by?: string // Backend uses approved_by
  completed_at?: string // For compatibility
  completed_by?: string // For compatibility
  comments?: string
  rejection_reason?: string
  auto_approved?: boolean
  created_at?: string
  updated_at?: string
}

export interface QuoteAction {
  id: string
  quote_id: string
  action: WorkflowAction
  performed_by: string
  performed_at: string
  comments?: string
  from_status: QuoteStatus
  to_status: QuoteStatus
}
