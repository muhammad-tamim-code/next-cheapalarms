import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * React Query mutation for deleting a user/contact
 * @param {string} scope - 'local' | 'ghl' | 'both'
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, locationId, scope = 'local' }) => {
      // Use Next.js API route instead of direct wpFetch
      // The API route runs server-side and can read httpOnly cookies
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
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
      // Invalidate user and contact queries
      queryClient.invalidateQueries({ queryKey: ['wp-users'] });
      queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
      
      toast.success('User/contact deleted successfully');
    },
    onError: (error, variables) => {
      // Log error for debugging (sanitized in production)
      if (process.env.NODE_ENV === 'development') {
        console.error('[useDeleteUser] Error:', error, { variables });
      }

      const message = error.message || 'Failed to delete user/contact';
      toast.error(message);
    },
  });
}

