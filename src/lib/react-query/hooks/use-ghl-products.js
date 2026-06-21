import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Fetch the GHL product catalog from local snapshots (via WP plugin).
 * Returns { ok, items:[{ id, name, sku, description, image, productType, amount, currency, hasPrices }], total, cached, source }.
 */
async function fetchGhlProducts(search) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/products/ghl${qs}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.err || json?.error || "Failed to load products");
  }
  return json;
}

export function useGhlProducts({ search = "", enabled = true } = {}) {
  return useQuery({
    queryKey: ["ghl-products", search],
    queryFn: () => fetchGhlProducts(search),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}

/** Trigger a full catalog + chunked price sync on the server. */
export function useSyncGhlProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/products/ghl/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.err || json?.error || "Product sync failed");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ghl-products"] });
    },
  });
}
