import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

/**
 * React Query mutation for deleting an estimate
 * Uses Next.js API route (/api/admin/estimates/[estimateId]/delete) which runs server-side
 * and can read httpOnly cookies for authentication.
 * @param {string} scope - 'local' | 'ghl' | 'both'
 */
export function useDeleteEstimate() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ estimateId, locationId, scope = 'local' }) => {
      // Use Next.js API route instead of direct wpFetch
      // The API route runs server-side and can read httpOnly cookies
      const res = await fetch(`/api/admin/estimates/${estimateId}/delete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'DELETE',
          scope,
          locationId,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.err || 'Delete failed');
      }

      const data = json;

      const localOk = data?.local?.ok === true;
      const ghlOk = data?.ghl?.ok === true;
      const effectiveOk =
        data?.ok === true &&
        (scope === 'local' ? localOk : scope === 'ghl' ? ghlOk : localOk && ghlOk);

      if (!effectiveOk) {
        throw new Error(
          data?.error ||
            data?.ghl?.error ||
            data?.local?.error ||
            'Delete failed'
        );
      }

      return data;
    },
    onMutate: async ({ estimateId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-estimates'] });
      await queryClient.cancelQueries({ queryKey: ['admin-estimates-trash'] });

      // Snapshot previous values
      const previousEstimates = queryClient.getQueryData(['admin-estimates']);

      // Optimistically remove from list (only for local scope)
      queryClient.setQueryData(['admin-estimates'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items?.filter((item) => item.id !== estimateId) || [],
          total: Math.max(0, (old.total || 0) - 1),
        };
      });

      return { previousEstimates };
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-estimates-trash'] });
      queryClient.invalidateQueries({ queryKey: ['admin-estimate', variables.estimateId] });
      
      // Only navigate if we're on a detail page
      if (router.pathname.includes('/[estimateId]')) {
        router.push('/admin/estimates');
      }
      
      const scope = variables.scope || 'local';
      const isLocalDelete = scope === 'local' || scope === 'both';
      
      if (isLocalDelete) {
        toast.success('Estimate moved to trash', {
          description: 'You can restore it from the Trash tab within 30 days.',
          duration: 5000,
        });
      } else {
        toast.success('Estimate deleted from GHL', {
          description: 'The estimate has been removed from GoHighLevel.',
          duration: 5000,
        });
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousEstimates) {
        queryClient.setQueryData(['admin-estimates'], context.previousEstimates);
      }

      // Log error for debugging (sanitized in production)
      if (process.env.NODE_ENV === 'development') {
        console.error('[useDeleteEstimate] Error:', error, { variables });
      }

      const message = error.message || 'Failed to delete estimate';
      toast.error('Delete failed', {
        description: message,
      });
    },
  });
}

