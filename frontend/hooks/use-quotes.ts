import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useQuotes(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => apiClient.listQuotes(filters),
  });
}

export function useQuote(quoteId: string, skip?: boolean) {
  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => apiClient.getQuote(quoteId),
    enabled: !!quoteId && !skip,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useQuoteActions() {
  const queryClient = useQueryClient();
  
  return {
    submit: useMutation({
      mutationFn: ({ quoteId }: { quoteId: string }) => 
        apiClient.submitQuote(quoteId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] });
      },
    }),
    
    terminate: useMutation({
      mutationFn: ({ quoteId, reason }: { quoteId: string; reason: string }) =>
        apiClient.terminateQuote(quoteId, reason),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        // Also invalidate the specific quote to refresh workflow data
        queryClient.invalidateQueries({ queryKey: ['quote'] });
      },
    }),
    
    reopen: useMutation({
      mutationFn: ({ quoteId }: { quoteId: string }) =>
        apiClient.reopenQuote(quoteId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        // Also invalidate the specific quote to refresh workflow data
        queryClient.invalidateQueries({ queryKey: ['quote'] });
      },
    }),
  };
}

export function useWorkflowActions() {
  const queryClient = useQueryClient();
  
  return {
    approve: useMutation({
      mutationFn: ({ stepId, comments, quoteId }: { stepId: string; comments?: string; quoteId?: string }) => {
        // PREVENT API CALLS WITH TEMPORARY IDs
        if (stepId && stepId.toString().startsWith('step-')) {
          console.error(`Refusing to approve temporary step ID: ${stepId}`);
          throw new Error('Cannot approve step with temporary ID');
        }
        return apiClient.approveStep(stepId, comments);
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        // Invalidate the specific quote to refresh workflow data
        if (variables.quoteId) {
          queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] });
        } else {
          // Fallback: invalidate all quote queries
          queryClient.invalidateQueries({ queryKey: ['quote'] });
        }
      },
    }),
    
    reject: useMutation({
      mutationFn: ({ stepId, reason, quoteId }: { stepId: string; reason: string; quoteId?: string }) => {
        // PREVENT API CALLS WITH TEMPORARY IDs
        if (stepId && stepId.toString().startsWith('step-')) {
          console.error(`Refusing to reject temporary step ID: ${stepId}`);
          throw new Error('Cannot reject step with temporary ID');
        }
        return apiClient.rejectStep(stepId, reason);
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        // Invalidate the specific quote to refresh workflow data
        if (variables.quoteId) {
          queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] });
        } else {
          // Fallback: invalidate all quote queries
          queryClient.invalidateQueries({ queryKey: ['quote'] });
        }
      },
    }),
  };
}