import { useQuery } from '@tanstack/react-query';

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
 * Paginated GHL contacts list with total count from WordPress proxy.
 */
export function useGHLContactsList({
  search = '',
  limit = 500,
  offset = 0,
  enabled = true,
  initialData,
} = {}) {
  return useQuery({
    queryKey: ['ghl-contacts', search, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));
      if (offset) params.set('offset', String(offset));
      if (search) params.set('search', search);

      const res = await fetch(`/api/ghl/contacts/list?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.err || error.error || 'Failed to fetch GHL contacts');
      }

      const data = await res.json();
      const contacts = data.contacts ?? data.contact ?? (Array.isArray(data) ? data : []);

      return {
        contacts,
        total: data.total ?? contacts.length,
        limit: data.limit ?? limit,
        offset: data.offset ?? offset,
      };
    },
    enabled,
    initialData: initialData
      ? { contacts: initialData, total: initialData.length, limit, offset }
      : undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

/**
 * React Query hook for fetching GHL contacts (legacy — returns array only).
 */
export function useGHLContacts({ limit = 50, enabled = true, initialData } = {}) {
  const list = useGHLContactsList({ limit, enabled, initialData });
  return {
    ...list,
    data: list.data?.contacts ?? initialData ?? [],
  };
}

