import { supabase } from './supabase'
import { 
  ApprovalWorkflow, 
  ApprovalWorkflowCreate, 
  WorkflowActionRequest,
  WorkflowStepFormData,
  DragDropResult
} from '../types/workflows'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

// Workflow-specific error types
export interface WorkflowApiError extends ApiError {
  workflow_id?: string
  step_order?: number
  action?: string
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async getAuthHeaders() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`
        })
      }
    } catch (error) {
      console.error('Auth header error:', error)
      return {
        'Content-Type': 'application/json'
      }
    }
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorDetails = null

      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
        errorDetails = errorData
      } catch {
        // Response body isn't JSON, use status text
      }

      const apiError: ApiError = {
        message: errorMessage,
        status: response.status,
        details: errorDetails
      }

      // Add specific error types
      if (response.status === 401) {
        apiError.code = 'UNAUTHORIZED'
      } else if (response.status === 403) {
        apiError.code = 'FORBIDDEN'
      } else if (response.status === 404) {
        apiError.code = 'NOT_FOUND'
      } else if (response.status === 422) {
        apiError.code = 'VALIDATION_ERROR'
      } else if (response.status >= 500) {
        apiError.code = 'SERVER_ERROR'
      } else if (response.status >= 400) {
        apiError.code = 'CLIENT_ERROR'
      }

      throw apiError
    }

    try {
      return await response.json()
    } catch {
      return null
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const headers = await this.getAuthHeaders()
        
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return await this.handleResponse(response)
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          message: 'Request timeout - please check your connection',
          status: 0,
          code: 'TIMEOUT'
        }
        throw timeoutError
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError: ApiError = {
          message: 'Network error - please check your connection',
          status: 0,
          code: 'NETWORK_ERROR'
        }
        throw networkError
      }

      throw error
    }
  }

  async get(endpoint: string) {
    return this.makeRequest(endpoint, { method: 'GET' })
  }

  async post(endpoint: string, data: any) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put(endpoint: string, data: any) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete(endpoint: string) {
    return this.makeRequest(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()

// Workflow API methods
export const workflowsApi = {
  // Get all workflows for current user
  async getWorkflows(): Promise<ApprovalWorkflow[]> {
    try {
      return await api.get('/api/workflows')
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
      throw this.handleWorkflowError(error, 'fetch workflows')
    }
  },

  // Get specific workflow by ID
  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow> {
    try {
      return await api.get(`/api/workflows/${workflowId}`)
    } catch (error) {
      console.error(`Failed to fetch workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'fetch workflow', workflowId)
    }
  },

  // Create new workflow
  async createWorkflow(workflowData: ApprovalWorkflowCreate): Promise<ApprovalWorkflow> {
    try {
      return await api.post('/api/workflows', workflowData)
    } catch (error) {
      console.error('Failed to create workflow:', error)
      throw this.handleWorkflowError(error, 'create workflow')
    }
  },

  // Update workflow steps order (from drag-and-drop)
  async updateWorkflowSteps(workflowId: string, result: DragDropResult): Promise<ApprovalWorkflow> {
    try {
      const updateData = {
        steps: result.items.map((item, index) => ({
          ...item,
          order: index + 1
        }))
      }
      
      return await api.put(`/api/workflows/${workflowId}/steps`, updateData)
    } catch (error) {
      console.error(`Failed to update workflow ${workflowId} steps:`, error)
      throw this.handleWorkflowError(error, 'reorder steps', workflowId)
    }
  },

  // Approve workflow step
  async approveStep(
    workflowId: string, 
    stepOrder: number, 
    action: WorkflowActionRequest
  ): Promise<ApprovalWorkflow> {
    try {
      return await api.post(`/api/workflows/${workflowId}/steps/${stepOrder}/approve`, action)
    } catch (error) {
      console.error(`Failed to approve step ${stepOrder} in workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'approve step', workflowId, stepOrder)
    }
  },

  // Reject workflow step
  async rejectStep(
    workflowId: string, 
    stepOrder: number, 
    action: WorkflowActionRequest
  ): Promise<ApprovalWorkflow> {
    try {
      // Ensure rejection reason is provided for reject actions
      if (action.action === 'reject' && (!action.rejection_reason || action.rejection_reason.trim() === '')) {
        throw new Error('Rejection reason is required when rejecting a step')
      }
      
      return await api.post(`/api/workflows/${workflowId}/steps/${stepOrder}/reject`, action)
    } catch (error) {
      console.error(`Failed to reject step ${stepOrder} in workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'reject step', workflowId, stepOrder)
    }
  },

  // Escalate workflow step
  async escalateStep(
    workflowId: string, 
    stepOrder: number, 
    action: WorkflowActionRequest
  ): Promise<ApprovalWorkflow> {
    try {
      if (!action.escalate_to) {
        throw new Error('Escalation target is required')
      }
      
      return await api.post(`/api/workflows/${workflowId}/steps/${stepOrder}/escalate`, action)
    } catch (error) {
      console.error(`Failed to escalate step ${stepOrder} in workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'escalate step', workflowId, stepOrder)
    }
  },

  // Generic workflow action handler
  async performWorkflowAction(
    workflowId: string,
    stepOrder: number,
    action: WorkflowActionRequest
  ): Promise<ApprovalWorkflow> {
    switch (action.action) {
      case 'approve':
        return this.approveStep(workflowId, stepOrder, action)
      case 'reject':
        return this.rejectStep(workflowId, stepOrder, action)
      case 'escalate':
        return this.escalateStep(workflowId, stepOrder, action)
      default:
        throw new Error(`Unknown workflow action: ${action.action}`)
    }
  },

  // Update workflow metadata
  async updateWorkflow(
    workflowId: string, 
    updateData: Partial<ApprovalWorkflowCreate>
  ): Promise<ApprovalWorkflow> {
    try {
      return await api.put(`/api/workflows/${workflowId}`, updateData)
    } catch (error) {
      console.error(`Failed to update workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'update workflow', workflowId)
    }
  },

  // Start workflow manually
  async startWorkflow(workflowId: string): Promise<ApprovalWorkflow> {
    try {
      return await api.post(`/api/workflows/${workflowId}/start`, {})
    } catch (error) {
      console.error(`Failed to start workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'start workflow', workflowId)
    }
  },

  // Delete workflow
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await api.delete(`/api/workflows/${workflowId}`)
    } catch (error) {
      console.error(`Failed to delete workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'delete workflow', workflowId)
    }
  },

  // Get workflow templates
  async getWorkflowTemplates(): Promise<ApprovalWorkflow[]> {
    try {
      return await api.get('/api/workflows/templates')
    } catch (error) {
      console.error('Failed to fetch workflow templates:', error)
      throw this.handleWorkflowError(error, 'fetch templates')
    }
  },

  // Clone workflow from template
  async cloneFromTemplate(templateId: string, customizations?: Partial<ApprovalWorkflowCreate>): Promise<ApprovalWorkflow> {
    try {
      return await api.post(`/api/workflows/templates/${templateId}/clone`, customizations || {})
    } catch (error) {
      console.error(`Failed to clone workflow from template ${templateId}:`, error)
      throw this.handleWorkflowError(error, 'clone from template', templateId)
    }
  },

  // Bulk workflow operations
  async bulkApprove(workflowId: string, stepOrders: number[], comments?: string): Promise<ApprovalWorkflow> {
    try {
      return await api.post(`/api/workflows/${workflowId}/bulk-approve`, {
        step_orders: stepOrders,
        comments
      })
    } catch (error) {
      console.error(`Failed to bulk approve steps in workflow ${workflowId}:`, error)
      throw this.handleWorkflowError(error, 'bulk approve', workflowId)
    }
  },

  // Get workflow analytics/stats
  async getWorkflowStats(workflowId: string): Promise<{
    total_steps: number
    completed_steps: number
    pending_steps: number
    average_completion_time: number
    current_step_age: number
  }> {
    try {
      return await api.get(`/api/workflows/${workflowId}/stats`)
    } catch (error) {
      console.error(`Failed to fetch workflow ${workflowId} stats:`, error)
      throw this.handleWorkflowError(error, 'fetch stats', workflowId)
    }
  },

  // Error handling helper
  handleWorkflowError(
    error: any, 
    operation: string, 
    workflowId?: string, 
    stepOrder?: number
  ): WorkflowApiError {
    const baseError = error as ApiError
    
    const workflowError: WorkflowApiError = {
      ...baseError,
      workflow_id: workflowId,
      step_order: stepOrder,
      action: operation
    }

    // Add specific workflow error context
    switch (baseError.code) {
      case 'VALIDATION_ERROR':
        if (operation.includes('reject') && !baseError.message.includes('rejection_reason')) {
          workflowError.message = 'Rejection reason is required when rejecting a step'
        } else if (operation.includes('escalate') && !baseError.message.includes('escalate_to')) {
          workflowError.message = 'Escalation target is required when escalating a step'
        }
        break
        
      case 'FORBIDDEN':
        workflowError.message = `You don't have permission to ${operation}`
        break
        
      case 'NOT_FOUND':
        if (workflowId) {
          workflowError.message = `Workflow ${workflowId} not found`
        } else {
          workflowError.message = 'Workflow not found'
        }
        break
        
      case 'CONFLICT':
        workflowError.message = 'Workflow has been modified by another user. Please refresh and try again.'
        break
        
      default:
        if (workflowError.message && !workflowError.message.includes(operation)) {
          workflowError.message = `Failed to ${operation}: ${workflowError.message}`
        } else if (!workflowError.message) {
          workflowError.message = `Failed to ${operation}`
        }
    }

    return workflowError
  }
}

// Legacy exports for backwards compatibility
export const {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflowSteps,
  approveStep,
  rejectStep,
  escalateStep,
  performWorkflowAction,
  updateWorkflow,
  deleteWorkflow
} = workflowsApi