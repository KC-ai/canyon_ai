import { supabase } from '@/lib/api-client';

export function subscribeToQuoteUpdates(
  quoteId: string,
  onUpdate: (payload: any) => void
) {
  const subscription = supabase
    .channel(`quote:${quoteId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'quotes',
        filter: `id=eq.${quoteId}`,
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workflow_steps',
        filter: `quote_id=eq.${quoteId}`,
      },
      onUpdate
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}