import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../api/apiFetch";

export function useRolesCatalog() {
  return useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const data = await apiFetch("/api/admin/roles");
      return {
        roles: data.roles ?? [],
        assignableRoles: data.assignable_roles ?? [],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useStaffUsers() {
  return useQuery({
    queryKey: ["admin", "staff-users"],
    queryFn: async () => {
      const data = await apiFetch("/api/admin/staff-users");
      return data.users ?? [];
    },
    staleTime: 60 * 1000,
  });
}

export function useAssignUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleKey, allowedLocationIds }) => {
      return apiFetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        body: {
          role_key: roleKey,
          allowed_location_ids: allowedLocationIds ?? [],
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff-users"] });
    },
  });
}

export function useCreateStaffUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, displayName, roleKey, allowedLocationIds }) => {
      return apiFetch("/api/admin/users", {
        method: "POST",
        body: {
          email,
          display_name: displayName,
          role_key: roleKey,
          allowed_location_ids: allowedLocationIds ?? [],
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff-users"] });
    },
  });
}
