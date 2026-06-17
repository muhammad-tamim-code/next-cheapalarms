import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * React Query mutation for bulk deleting invoices
 * Includes optimistic updates and progress tracking
 */
export function useBulkDeleteInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceIds, locationId, scope = 'local' }) => {
      // Use Next.js API route instead of direct wpFetch
      // The API route runs server-side and can read httpOnly cookies
      const res = await fetch('/api/admin/invoices/bulk-delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'BULK_DELETE',
          invoiceIds,
          scope,
          ...(locationId && { locationId }),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.err || 'Failed to delete invoices');
      }

      return json;
    },
    onMutate: async ({ invoiceIds }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-invoices'] });

      // Snapshot previous values
      const previousInvoices = queryClient.getQueryData(['admin-invoices']);

      // Optimistically remove from list
      queryClient.setQueryData(['admin-invoices'], (old) => {
        if (!old) return old;
        const idsSet = new Set(invoiceIds);
        return {
          ...old,
          items: old.items?.filter((item) => !idsSet.has(item.id)) || [],
          total: Math.max(0, (old.total || 0) - invoiceIds.length),
        };
      });

      return { previousInvoices };
    },
    onSuccess: (data, variables) => {
      const deleted = data.deleted || 0;
      const errors = data.errors || [];
      const scope = variables.scope || 'local';

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });

      if (errors.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Bulk delete partial failures:', errors);
        }
        toast.warning(`Deleted ${deleted} invoice${deleted !== 1 ? 's' : ''}`, {
          description: `${errors.length} invoice(s) failed to delete. Check console for details.`,
          duration: 6000,
        });
      } else {
        toast.success(`Deleted ${deleted} invoice${deleted !== 1 ? 's' : ''} successfully`, {
          description: scope === 'ghl' ? 'The invoices have been removed from GoHighLevel.' : 'The invoices have been deleted.',
          duration: 5000,
        });
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousInvoices) {
        queryClient.setQueryData(['admin-invoices'], context.previousInvoices);
      }

      // Log error for debugging (sanitized in production)
      if (process.env.NODE_ENV === 'development') {
        console.error('[useBulkDeleteInvoices] Error:', error, { variables });
      }

      const message = error.message || 'Failed to delete invoices';
      toast.error('Bulk delete failed', {
        description: message,
      });
    },
  });
}

