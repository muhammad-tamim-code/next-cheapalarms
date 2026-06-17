import { useQuery } from "@tanstack/react-query";

/**
 * Admin feature flags / integration hints from WordPress (`GET /ca/v1/admin/platform`).
 */
export function useAdminPlatform({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["admin-platform"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.err || "Failed to load platform settings");
      }
      return json;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
