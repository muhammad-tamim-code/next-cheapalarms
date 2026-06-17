import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/admin/settings/integrations";

/**
 * Aggregated integration status from WordPress (no secret values).
 */
export function useIntegrationStatus({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["integration-settings"],
    queryFn: async () => {
      const res = await fetch(BASE, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.err || json?.error || "Failed to load integration settings");
      }
      return json;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useTestGhlConnection() {
  return useMutation({
    mutationFn: async ({ api_key, location_id }) => {
      const res = await fetch(`${BASE}/ghl/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key, location_id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || json?.err || json?.error || "Connection test failed");
      }
      return json;
    },
  });
}

export function useSaveGhlSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ api_key, location_id }) => {
      const res = await fetch(`${BASE}/ghl`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key, location_id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || json?.err || json?.error || "Failed to save GHL settings");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
    },
  });
}

export function useDeleteGhlSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/ghl`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || json?.err || json?.error || "Failed to clear GHL settings");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
    },
  });
}

export function useTestStripeConnection() {
  return useMutation({
    mutationFn: async ({ secret_key, publishable_key }) => {
      const res = await fetch(`${BASE}/stripe/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_key, publishable_key }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || json?.err || json?.error || "Stripe test failed");
      }
      return json;
    },
  });
}

export function useSaveStripeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ secret_key, publishable_key, webhook_secret }) => {
      const res = await fetch(`${BASE}/stripe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_key, publishable_key, webhook_secret }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || json?.err || json?.error || "Failed to save Stripe settings");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
    },
  });
}

export function useDeleteStripeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/stripe`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || json?.err || json?.error || "Failed to clear Stripe settings");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
    },
  });
}
