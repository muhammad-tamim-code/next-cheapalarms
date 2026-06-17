import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

/**
 * React Query mutation for deleting an invoice
 * @param {string} scope - 'local' | 'ghl' | 'both'
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ invoiceId, locationId, scope = 'local' }) => {
      // Use Next.js API route instead of direct wpFetch
      // The API route runs server-side and can read httpOnly cookies
      const res = await fetch(`/api/admin/invoices/${invoiceId}/delete`, {
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
    onSuccess: (data, variables) => {
      // Invalidate all invoice queries
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invoice', variables.invoiceId] });
      
      // Navigate back to invoices list
      router.push('/admin/invoices');
      
      toast.success('Invoice deleted successfully');
    },
    onError: (error, variables) => {
      // Log error for debugging (sanitized in production)
      if (process.env.NODE_ENV === 'development') {
        console.error('[useDeleteInvoice] Error:', error, { variables });
      }

      const message = error.message || 'Failed to delete invoice';
      toast.error(message);
    },
  });
}

