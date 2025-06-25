// Mirror of backend Pydantic models for workflows

// Enums matching backend
export enum PersonaType {
  AE = "ae",
  DEAL_DESK = "deal_desk", 
  CRO = "cro",
  LEGAL = "legal",
  FINANCE = "finance",
  SALES_MANAGER = "sales_manager",
  VP_SALES = "vp_sales"
}

export enum WorkflowStepStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  APPROVED = "approved", 
  REJECTED = "rejected",
  SKIPPED = "skipped"
}

export enum WorkflowStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  FAILED = "failed"
}

export enum ApprovalAction {
  APPROVE = "approve",
  REJECT = "reject", 
  REQUEST_CHANGES = "request_changes",
  ESCALATE = "escalate"
}

// Base workflow step interfaces
export interface WorkflowStepBase {
  name: string
  description?: string
  persona: PersonaType
  order: number
  is_required: boolean
  auto_approve_threshold?: number
  escalation_threshold?: number
  max_processing_days: number
}

export interface WorkflowStepCreate extends WorkflowStepBase {}

export interface WorkflowStepUpdate extends Partial<WorkflowStepBase> {
  id?: string
}

export interface WorkflowStep extends WorkflowStepBase {
  id: string
  workflow_id: string
  status: WorkflowStepStatus
  assigned_user_id?: string
  assigned_at?: string
  completed_at?: string
  completed_by?: string
  action_taken?: ApprovalAction
  comments?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  // Computed properties from backend
  is_overdue?: boolean
  days_remaining?: number
}

// Base approval workflow interfaces
export interface ApprovalWorkflowBase {
  name: string
  description?: string
  is_active: boolean
  trigger_amount?: number
  trigger_discount_percent?: number
  auto_start: boolean
  allow_parallel_steps: boolean
  require_all_approvals: boolean
}

export interface ApprovalWorkflowCreate extends ApprovalWorkflowBase {
  steps: WorkflowStepCreate[]
}

export interface ApprovalWorkflowUpdate extends Partial<ApprovalWorkflowBase> {}

export interface ApprovalWorkflow extends ApprovalWorkflowBase {
  id: string
  user_id: string
  status: WorkflowStatus
  quote_id?: string
  steps: WorkflowStep[]
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  // Computed properties from backend
  current_step?: WorkflowStep
  progress_percentage?: number
  is_approved?: boolean
  is_rejected?: boolean
  overdue_steps?: WorkflowStep[]
  item_count?: number
}

// Workflow action request
export interface WorkflowActionRequest {
  action: ApprovalAction
  comments?: string
  rejection_reason?: string
  escalate_to?: PersonaType
}

// API Response types
export interface WorkflowListResponse {
  workflows: ApprovalWorkflow[]
  total: number
  page: number
  limit: number
  has_next: boolean
  has_prev: boolean
}

export interface WorkflowStatusResponse {
  workflow_id: string
  status: WorkflowStatus
  is_complete: boolean
  is_approved: boolean
  is_rejected: boolean
  progress_percentage: number
  current_step?: {
    order: number
    name: string
    persona: PersonaType
    status: WorkflowStepStatus
  }
  overdue_steps: number
  total_steps: number
  completed_steps: number
}

export interface PendingWorkflowsResponse {
  persona: PersonaType
  pending_count: number
  workflows: Array<{
    workflow_id: string
    workflow_name: string
    quote_id?: string
    step_order: number
    step_name: string
    assigned_at?: string
    days_remaining?: number
    is_overdue: boolean
  }>
}

export interface OverdueWorkflowsResponse {
  overdue_count: number
  workflows: Array<{
    workflow_id: string
    workflow_name: string
    quote_id?: string
    overdue_steps: Array<{
      order: number
      name: string
      persona: PersonaType
      days_overdue: number
    }>
  }>
}

export interface WorkflowSummaryResponse {
  active_workflows: number
  completed_workflows: number
  overdue_workflows: number
  pending_approvals: number
}

// Form validation types
export interface WorkflowFormData {
  name: string
  description: string
  trigger_amount: string
  trigger_discount_percent: string
  auto_start: boolean
  allow_parallel_steps: boolean
  require_all_approvals: boolean
  steps: WorkflowStepFormData[]
}

export interface WorkflowStepFormData {
  id?: string
  name: string
  description: string
  persona: PersonaType | ""
  order: number
  is_required: boolean
  auto_approve_threshold: string
  escalation_threshold: string
  max_processing_days: number
}

export interface WorkflowActionFormData {
  action: ApprovalAction | ""
  comments: string
  rejection_reason: string
  escalate_to: PersonaType | ""
}

// Form validation errors
export interface WorkflowFormErrors {
  name?: string
  description?: string
  trigger_amount?: string
  trigger_discount_percent?: string
  steps?: WorkflowStepFormErrors[]
  general?: string
}

export interface WorkflowStepFormErrors {
  name?: string
  description?: string
  persona?: string
  order?: string
  auto_approve_threshold?: string
  escalation_threshold?: string
  max_processing_days?: string
}

export interface WorkflowActionFormErrors {
  action?: string
  comments?: string
  rejection_reason?: string
  escalate_to?: string
}

// Component prop interfaces
export interface WorkflowListProps {
  workflows: ApprovalWorkflow[]
  loading: boolean
  onWorkflowSelect: (workflow: ApprovalWorkflow) => void
  onRefresh: () => void
  pagination?: {
    page: number
    limit: number
    total: number
    has_next: boolean
    has_prev: boolean
    onPageChange: (page: number) => void
  }
}

export interface WorkflowCardProps {
  workflow: ApprovalWorkflow
  onClick: (workflow: ApprovalWorkflow) => void
  showActions?: boolean
  compact?: boolean
}

export interface WorkflowDetailsProps {
  workflow: ApprovalWorkflow
  onStepApprove: (stepOrder: number, data: WorkflowActionRequest) => Promise<void>
  onStepReject: (stepOrder: number, data: WorkflowActionRequest) => Promise<void>
  onStepEscalate: (stepOrder: number, data: WorkflowActionRequest) => Promise<void>
  onStepsReorder: (updates: WorkflowStepUpdate[]) => Promise<void>
  loading?: boolean
  readonly?: boolean
}

export interface WorkflowStepCardProps {
  step: WorkflowStep
  workflow: ApprovalWorkflow
  onApprove: (data: WorkflowActionRequest) => Promise<void>
  onReject: (data: WorkflowActionRequest) => Promise<void>
  onEscalate: (data: WorkflowActionRequest) => Promise<void>
  readonly?: boolean
  showActions?: boolean
}

export interface WorkflowBuilderProps {
  initialWorkflow?: Partial<ApprovalWorkflowCreate>
  onSave: (workflow: ApprovalWorkflowCreate) => Promise<void>
  onCancel: () => void
  loading?: boolean
  showSubmit?: boolean
}

export interface WorkflowStepBuilderProps {
  steps: WorkflowStepFormData[]
  onStepsChange: (steps: WorkflowStepFormData[]) => void
  onStepAdd: () => void
  onStepRemove: (index: number) => void
  onStepReorder: (fromIndex: number, toIndex: number) => void
  errors?: WorkflowStepFormErrors[]
  readonly?: boolean
}

export interface WorkflowProgressProps {
  workflow: ApprovalWorkflow
  showDetails?: boolean
  compact?: boolean
}

export interface WorkflowStatusBadgeProps {
  status: WorkflowStatus
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

export interface WorkflowStepStatusBadgeProps {
  status: WorkflowStepStatus
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

export interface PersonaBadgeProps {
  persona: PersonaType
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  showLabel?: boolean
}

export interface WorkflowActionModalProps {
  isOpen: boolean
  onClose: () => void
  step: WorkflowStep
  workflow: ApprovalWorkflow
  action: ApprovalAction
  onSubmit: (data: WorkflowActionRequest) => Promise<void>
  loading?: boolean
}

export interface WorkflowFiltersProps {
  onFilterChange: (filters: WorkflowFilters) => void
  currentFilters: WorkflowFilters
  availablePersonas: PersonaType[]
}

export interface WorkflowFilters {
  status?: WorkflowStatus[]
  persona?: PersonaType[]
  overdue?: boolean
  quote_id?: string
  date_range?: {
    start: string
    end: string
  }
}

// Drag and drop interfaces
export interface DragDropWorkflowStep extends WorkflowStepFormData {
  dragId: string
}

export interface DragDropResult {
  fromIndex: number
  toIndex: number
  items: DragDropWorkflowStep[]
}

// Workflow template interfaces
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  steps: WorkflowStepCreate[]
  trigger_amount?: number
  trigger_discount_percent?: number
  category: "standard" | "enterprise" | "custom"
  is_default?: boolean
}

export interface WorkflowTemplateProps {
  templates: WorkflowTemplate[]
  onTemplateSelect: (template: WorkflowTemplate) => void
  onTemplateCreate: () => void
  selectedTemplate?: WorkflowTemplate
}

// Dashboard interfaces
export interface WorkflowDashboardProps {
  summary: WorkflowSummaryResponse
  recentWorkflows: ApprovalWorkflow[]
  pendingApprovals: PendingWorkflowsResponse[]
  overdueWorkflows: OverdueWorkflowsResponse
  onWorkflowSelect: (workflow: ApprovalWorkflow) => void
  onRefresh: () => void
}

export interface WorkflowMetricsProps {
  summary: WorkflowSummaryResponse
  showTrends?: boolean
  timeRange?: "week" | "month" | "quarter"
}

// Notification interfaces
export interface WorkflowNotification {
  id: string
  type: "approval_needed" | "approved" | "rejected" | "overdue" | "escalated"
  workflow_id: string
  workflow_name: string
  step_name?: string
  persona?: PersonaType
  message: string
  created_at: string
  read: boolean
  priority: "low" | "medium" | "high"
}

export interface WorkflowNotificationProps {
  notifications: WorkflowNotification[]
  onNotificationRead: (id: string) => void
  onNotificationAction: (notification: WorkflowNotification) => void
  maxNotifications?: number
}

// Search and filter types
export interface WorkflowSearchFilters {
  query?: string
  status?: WorkflowStatus[]
  persona?: PersonaType[]
  quote_id?: string
  overdue?: boolean
  created_after?: string
  created_before?: string
  completed_after?: string
  completed_before?: string
}

export interface WorkflowSearchResult {
  workflows: ApprovalWorkflow[]
  total: number
  took: number
  filters_applied: WorkflowSearchFilters
}

// Bulk operations
export interface WorkflowBulkAction {
  action: "approve" | "reject" | "escalate" | "cancel"
  workflow_ids: string[]
  step_orders?: number[]
  data?: WorkflowActionRequest
}

export interface WorkflowBulkResult {
  success_count: number
  error_count: number
  errors: Array<{
    workflow_id: string
    error: string
  }>
}

// Export/Import types
export interface WorkflowExportOptions {
  format: "json" | "csv" | "excel"
  include_steps: boolean
  include_history: boolean
  date_range?: {
    start: string
    end: string
  }
  filters?: WorkflowSearchFilters
}

export interface WorkflowImportData {
  workflows: ApprovalWorkflowCreate[]
  templates?: WorkflowTemplate[]
  validate_only?: boolean
}

export interface WorkflowImportResult {
  imported_count: number
  skipped_count: number
  error_count: number
  errors: Array<{
    row: number
    field?: string
    error: string
  }>
}

// Persona display helpers
export const PersonaDisplayNames: Record<PersonaType, string> = {
  [PersonaType.AE]: "Account Executive",
  [PersonaType.DEAL_DESK]: "Deal Desk",
  [PersonaType.CRO]: "Chief Revenue Officer", 
  [PersonaType.LEGAL]: "Legal Team",
  [PersonaType.FINANCE]: "Finance Team",
  [PersonaType.SALES_MANAGER]: "Sales Manager",
  [PersonaType.VP_SALES]: "VP of Sales"
}

export const PersonaColors: Record<PersonaType, string> = {
  [PersonaType.AE]: "blue",
  [PersonaType.DEAL_DESK]: "green",
  [PersonaType.CRO]: "purple",
  [PersonaType.LEGAL]: "orange",
  [PersonaType.FINANCE]: "red",
  [PersonaType.SALES_MANAGER]: "teal",
  [PersonaType.VP_SALES]: "indigo"
}

export const WorkflowStatusColors: Record<WorkflowStatus, string> = {
  [WorkflowStatus.DRAFT]: "gray",
  [WorkflowStatus.ACTIVE]: "blue", 
  [WorkflowStatus.COMPLETED]: "green",
  [WorkflowStatus.CANCELLED]: "yellow",
  [WorkflowStatus.FAILED]: "red"
}

export const WorkflowStepStatusColors: Record<WorkflowStepStatus, string> = {
  [WorkflowStepStatus.PENDING]: "yellow",
  [WorkflowStepStatus.IN_PROGRESS]: "blue",
  [WorkflowStepStatus.APPROVED]: "green",
  [WorkflowStepStatus.REJECTED]: "red",
  [WorkflowStepStatus.SKIPPED]: "gray"
}

// Validation helpers
export const validateWorkflowForm = (data: WorkflowFormData): WorkflowFormErrors => {
  const errors: WorkflowFormErrors = {}
  
  if (!data.name.trim()) {
    errors.name = "Workflow name is required"
  } else if (data.name.length > 200) {
    errors.name = "Workflow name must be 200 characters or less"
  }
  
  if (data.description && data.description.length > 2000) {
    errors.description = "Description must be 2000 characters or less"
  }
  
  if (data.trigger_amount && (isNaN(Number(data.trigger_amount)) || Number(data.trigger_amount) < 0)) {
    errors.trigger_amount = "Trigger amount must be a positive number"
  }
  
  if (data.trigger_discount_percent && (isNaN(Number(data.trigger_discount_percent)) || Number(data.trigger_discount_percent) < 0 || Number(data.trigger_discount_percent) > 100)) {
    errors.trigger_discount_percent = "Discount percent must be between 0 and 100"
  }
  
  if (!data.steps || data.steps.length === 0) {
    errors.general = "At least one workflow step is required"
  } else {
    const stepErrors: WorkflowStepFormErrors[] = []
    const orders = data.steps.map(s => s.order)
    const hasDuplicateOrders = orders.length !== new Set(orders).size
    
    if (hasDuplicateOrders) {
      errors.general = "Step orders must be unique"
    }
    
    data.steps.forEach((step, index) => {
      const stepError: WorkflowStepFormErrors = {}
      
      if (!step.name.trim()) {
        stepError.name = "Step name is required"
      } else if (step.name.length > 200) {
        stepError.name = "Step name must be 200 characters or less"
      }
      
      if (!step.persona) {
        stepError.persona = "Persona is required"
      }
      
      if (step.order < 1 || step.order > 100) {
        stepError.order = "Step order must be between 1 and 100"
      }
      
      if (step.auto_approve_threshold && (isNaN(Number(step.auto_approve_threshold)) || Number(step.auto_approve_threshold) < 0)) {
        stepError.auto_approve_threshold = "Auto-approve threshold must be a positive number"
      }
      
      if (step.escalation_threshold && (isNaN(Number(step.escalation_threshold)) || Number(step.escalation_threshold) < 0)) {
        stepError.escalation_threshold = "Escalation threshold must be a positive number"
      }
      
      if (step.max_processing_days < 1 || step.max_processing_days > 30) {
        stepError.max_processing_days = "Processing days must be between 1 and 30"
      }
      
      if (Object.keys(stepError).length > 0) {
        stepErrors[index] = stepError
      }
    })
    
    if (stepErrors.length > 0) {
      errors.steps = stepErrors
    }
  }
  
  return errors
}

export const validateWorkflowAction = (data: WorkflowActionFormData): WorkflowActionFormErrors => {
  const errors: WorkflowActionFormErrors = {}
  
  if (!data.action) {
    errors.action = "Action is required"
  }
  
  if (data.action === ApprovalAction.REJECT && !data.rejection_reason.trim()) {
    errors.rejection_reason = "Rejection reason is required when rejecting"
  }
  
  if (data.action === ApprovalAction.ESCALATE && !data.escalate_to) {
    errors.escalate_to = "Escalation target is required when escalating"
  }
  
  if (data.comments && data.comments.length > 2000) {
    errors.comments = "Comments must be 2000 characters or less"
  }
  
  if (data.rejection_reason && data.rejection_reason.length > 1000) {
    errors.rejection_reason = "Rejection reason must be 1000 characters or less"
  }
  
  return errors
}

// Utility functions
export const getPersonaDisplayName = (persona: PersonaType): string => {
  return PersonaDisplayNames[persona] || persona
}

export const getPersonaColor = (persona: PersonaType): string => {
  return PersonaColors[persona] || "gray"
}

export const getWorkflowStatusColor = (status: WorkflowStatus): string => {
  return WorkflowStatusColors[status] || "gray"
}

export const getWorkflowStepStatusColor = (status: WorkflowStepStatus): string => {
  return WorkflowStepStatusColors[status] || "gray"
}

export const isWorkflowEditable = (workflow: ApprovalWorkflow): boolean => {
  return workflow.status === WorkflowStatus.DRAFT || workflow.status === WorkflowStatus.ACTIVE
}

export const canApproveStep = (step: WorkflowStep): boolean => {
  return step.status === WorkflowStepStatus.PENDING || step.status === WorkflowStepStatus.IN_PROGRESS
}

export const getNextStepOrder = (steps: WorkflowStepFormData[]): number => {
  if (steps.length === 0) return 1
  return Math.max(...steps.map(s => s.order)) + 1
}