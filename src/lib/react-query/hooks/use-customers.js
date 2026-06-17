import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * React Query hook for fetching WordPress users
 * Automatically handles caching, deduplication, and refetching
 */
export function useWordPressUsers({ enabled = true, initialData } = {}) {
  return useQuery({
    queryKey: ['wp-users'],
    queryFn: async () => {
      const res = await fetch('/api/users', {
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.err || error.error || 'Failed to fetch WordPress users');
      }

      const data = await res.json();
      return data.users ?? [];
    },
    enabled,
    initialData,
    staleTime: initialData ? Infinity : 5 * 60 * 1000, // Infinity if we have initial data, else 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * React Query hook for fetching GHL contacts
 * Automatically handles caching, deduplication, and refetching
 */
export function useGHLContacts({ limit = 50, enabled = true, initialData } = {}) {
  return useQuery({
    queryKey: ['ghl-contacts', limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.set('limit', limit.toString());
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/ghl/contacts/list${queryString}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.err || error.error || 'Failed to fetch GHL contacts');
      }

      const data = await res.json();
      return data.contacts ?? data.contact ?? (Array.isArray(data) ? data : []);
    },
    enabled,
    initialData,
    staleTime: 2 * 60 * 1000, // 2 minutes — allows refetch after mutations
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

