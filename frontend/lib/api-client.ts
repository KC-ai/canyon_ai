import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private token: string | null = null;

  setAuthToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Block requests to approve/reject temporary step IDs
    if (endpoint.includes('/workflow/steps/step-') && (endpoint.includes('/approve') || endpoint.includes('/reject'))) {
      console.error(`Blocking API request to temporary step endpoint: ${endpoint}`);
      throw new Error('Cannot perform actions on temporary step IDs');
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Get current persona from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.persona) {
          headers['X-User-Persona'] = user.persona;
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    
    // Merge with any provided headers
    const finalHeaders = {
      ...headers,
      ...(options.headers as Record<string, string> || {})
    };

    const response = await fetch(url, {
      ...options,
      headers: finalHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  }

  // Quote operations
  async createQuote(quoteData: any): Promise<any> {
    return this.request('/api/quotes/', {
      method: 'POST',
      body: JSON.stringify(quoteData),
    });
  }

  async updateQuote(quoteId: string, quoteData: any): Promise<any> {
    return this.request(`/api/quotes/${quoteId}`, {
      method: 'PUT',
      body: JSON.stringify(quoteData),
    });
  }

  async listQuotes(filters?: { status?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.status) {
      params.append('status', filters.status);
    }
    return this.request(`/api/quotes/?${params}`);
  }

  async getQuote(quoteId: string): Promise<any> {
    return this.request(`/api/quotes/${quoteId}`);
  }

  async submitQuote(quoteId: string): Promise<any> {
    return this.request(`/api/quotes/${quoteId}/submit`, {
      method: 'POST',
    });
  }

  async terminateQuote(quoteId: string, reason: string): Promise<any> {
    return this.request(`/api/quotes/${quoteId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reopenQuote(quoteId: string): Promise<any> {
    return this.request(`/api/quotes/${quoteId}/reopen`, {
      method: 'POST',
    });
  }

  async deleteQuote(quoteId: string): Promise<any> {
    return this.request(`/api/quotes/${quoteId}`, {
      method: 'DELETE',
    });
  }

  async updateQuoteWorkflow(quoteId: string, workflowSteps: any[]): Promise<any> {
    return this.request(`/api/quotes/${quoteId}/workflow`, {
      method: 'PUT',
      body: JSON.stringify({ workflow_steps: workflowSteps }),
    });
  }

  // Workflow operations
  async approveStep(stepId: string, comments?: string): Promise<void> {
    console.trace(`API Client - approveStep called with stepId: ${stepId}`);
    if (stepId && stepId.toString().startsWith('step-')) {
      console.error(`API Client - Attempting to approve temporary step ID: ${stepId}`);
      throw new Error('Cannot approve step with temporary ID');
    }
    return this.request(`/api/workflow/steps/${stepId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }

  async rejectStep(stepId: string, reason: string): Promise<void> {
    return this.request(`/api/workflow/steps/${stepId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // AI operations
  async generateQuoteFromAI(prompt: string): Promise<any> {
    return this.request('/api/ai/generate-quote', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }
}

export const apiClient = new APIClient();