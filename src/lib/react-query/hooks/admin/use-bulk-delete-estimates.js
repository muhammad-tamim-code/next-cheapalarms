import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * React Query mutation for bulk deleting estimates
 * Uses Next.js API route (/api/admin/estimates/bulk-delete) which runs server-side
 * and can read httpOnly cookies for authentication.
 * Includes optimistic updates and progress tracking
 */
export function useBulkDeleteEstimates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ estimateIds, locationId, scope = 'local' }) => {
      // Use Next.js API route instead of direct wpFetch
      // The API route runs server-side and can read httpOnly cookies
      const res = await fetch('/api/admin/estimates/bulk-delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'BULK_DELETE',
          estimateIds,
          scope,
          ...(locationId && { locationId }),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.err || 'Failed to delete estimates');
      }

      return json;
    },
    onMutate: async ({ estimateIds }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-estimates'] });
      await queryClient.cancelQueries({ queryKey: ['admin-estimates-trash'] });

      // Snapshot previous values
      const previousEstimates = queryClient.getQueryData(['admin-estimates']);

      // Optimistically remove from list
      queryClient.setQueryData(['admin-estimates'], (old) => {
        if (!old) return old;
        const idsSet = new Set(estimateIds);
        return {
          ...old,
          items: old.items?.filter((item) => !idsSet.has(item.id)) || [],
          total: Math.max(0, (old.total || 0) - estimateIds.length),
        };
      });

      return { previousEstimates };
    },
    onSuccess: (data, variables) => {
      const deleted = data.deleted || 0;
      const errors = data.errors || [];
      const scope = variables.scope || 'local';
      const isLocalDelete = scope === 'local' || scope === 'both';

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-estimates-trash'] });

      if (errors.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Bulk delete partial failures:', errors);
        }
        toast.warning(`Deleted ${deleted} estimate${deleted !== 1 ? 's' : ''}`, {
          description: `${errors.length} estimate(s) failed to delete. Check console for details.`,
          duration: 6000,
        });
      } else {
        if (isLocalDelete) {
          toast.success(`Moved ${deleted} estimate${deleted !== 1 ? 's' : ''} to trash`, {
            description: 'You can restore them from the Trash tab within 30 days.',
            duration: 5000,
          });
        } else {
          toast.success(`Deleted ${deleted} estimate${deleted !== 1 ? 's' : ''} from GHL`, {
            description: 'The estimates have been removed from GoHighLevel.',
            duration: 5000,
          });
        }
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousEstimates) {
        queryClient.setQueryData(['admin-estimates'], context.previousEstimates);
      }

      // Log error for debugging (sanitized in production)
      if (process.env.NODE_ENV === 'development') {
        console.error('[useBulkDeleteEstimates] Error:', error, { variables });
      }

      const message = error.message || 'Failed to delete estimates';
      toast.error('Bulk delete failed', {
        description: message,
      });
    },
  });
}

