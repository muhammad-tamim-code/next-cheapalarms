import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../api/apiFetch";

/**
 * Admin: persist per-line photo flag overrides on an estimate.
 *
 * Variables: { estimateId, items: [{ name, photoRequired?, isHeading? }, ...] }
 * Each entry is a partial — fields you don't include are left as-is on the server.
 *
 * On success, the admin estimate cache is invalidated so itemsMeta surfaces
 * immediately in EstimateDetailContent. The customer portal status query is
 * also invalidated so the photo checklist re-derives required/heading flags
 * without a full reload.
 */
export function useUpdateItemsMeta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ estimateId, items }) => {
      if (!estimateId) {
        throw new Error("estimateId is required");
      }
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("items must be a non-empty array");
      }

      const result = await apiFetch(
        `/api/admin/estimates/${encodeURIComponent(estimateId)}/items-meta`,
        { method: "POST", body: { items } },
      );

      // Backend returns HTTP 200 with { ok: false, err } for soft-fail paths
      // (validation, lock contention, option-write failure). Surface those
      // as mutation errors so the UI shows the failure toast instead of a
      // misleading success.
      if (!result || result.ok === false) {
        throw new Error(result?.err || result?.error || "Failed to save photo policy");
      }
      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-estimate", variables.estimateId] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "portal-status" && query.queryKey[1] === variables.estimateId,
        refetchType: "all",
      });
    },
  });
}
