import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * React Query mutation for deleting a GHL contact (GHL only)
 */
export function useDeleteGhlContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, locationId }) => {
      const res = await fetch(`/api/admin/ghl/contacts/${contactId}/delete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'DELETE',
          locationId,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.err || 'Delete failed');
      }

      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
      const warning = data?.ghl?.warning;
      if (warning) {
        toast.success('Contact removed', { description: 'Contact may have already been deleted from GHL.' });
      } else {
        toast.success('GHL contact deleted successfully');
      }
    },
    onError: (error, variables) => {
      // Log error for debugging (sanitized in production)
      if (process.env.NODE_ENV === 'development') {
        console.error('[useDeleteGhlContact] Error:', error, { variables });
      }

      const message = error.message || 'Failed to delete GHL contact';
      toast.error(message);
    },
  });
}


