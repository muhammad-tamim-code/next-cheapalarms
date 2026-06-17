import Head from "next/head";
import { useEffect, useState } from "react";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Spinner } from "../../../components/ui/spinner";
import { requirePermission } from "../../../lib/auth/requirePermission";
import { hasPermission } from "../../../lib/auth/hasPermission";
import {
  useAssignUserRole,
  useCreateStaffUser,
  useRolesCatalog,
  useStaffUsers,
} from "../../../lib/react-query/hooks/admin/use-staff-team";

export default function AdminTeam({ authContext }) {
  const canManageRoles = hasPermission(authContext, "settings.manage");
  const canInvite = hasPermission(authContext, "customers.invite");

  const { data: rolesData, isLoading: rolesLoading } = useRolesCatalog();
  const { data: staffUsers = [], isLoading: usersLoading, refetch } = useStaffUsers();
  const assignRole = useAssignUserRole();
  const createUser = useCreateStaffUser();

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("customer");
  const [pendingRoles, setPendingRoles] = useState({});

  const assignableRoles = rolesData?.assignableRoles ?? [];
  const defaultNewRole = assignableRoles[0]?.role_key ?? "customer";
  const loading = rolesLoading || usersLoading;

  useEffect(() => {
    if (assignableRoles.length > 0 && !assignableRoles.some((r) => r.role_key === newRole)) {
      setNewRole(defaultNewRole);
    }
  }, [assignableRoles, defaultNewRole, newRole]);

  const handleRoleChange = async (userId, roleKey) => {
    setPendingRoles((prev) => ({ ...prev, [userId]: roleKey }));
    try {
      await assignRole.mutateAsync({ userId, roleKey });
    } finally {
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    await createUser.mutateAsync({
      email: newEmail.trim(),
      displayName: newName.trim() || newEmail.trim(),
      roleKey: newRole,
    });
    setNewEmail("");
    setNewName("");
    setNewRole(defaultNewRole);
    refetch();
  };

  return (
    <>
      <Head>
        <title>Admin • Team</title>
      </Head>
      <AdminLayout title="Team" authContext={authContext}>
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portal team</CardTitle>
              <CardDescription>
                Assign Customer, Staff, or Owner roles without using the WordPress dashboard.
                {authContext?.roleLabel && (
                  <span className="mt-1 block">
                    Signed in as <strong>{authContext.roleLabel}</strong>
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : staffUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff users found.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {staffUsers.map((user) => {
                    const currentRole = pendingRoles[user.id] ?? user.role_key;
                    const isSelf = user.id === authContext?.id;
                    return (
                      <li
                        key={user.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">{user.name || user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">{user.role_label}</Badge>
                            {user.allowed_location_ids?.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Scoped: {user.allowed_location_ids.join(", ")}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {canManageRoles && !isSelf ? (
                          <select
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                            value={currentRole}
                            disabled={assignRole.isPending}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          >
                            {(rolesData?.assignableRoles ?? rolesData?.roles ?? []).map((role) => (
                              <option key={role.role_key} value={role.role_key}>
                                {role.role_label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {isSelf ? "Your account" : "View only"}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {canInvite && (
            <Card>
              <CardHeader>
                <CardTitle>{canManageRoles ? "Add team member" : "Add customer account"}</CardTitle>
                <CardDescription>
                  Creates a WordPress user and assigns a portal role. They can set a password via
                  forgot-password on the login page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Email</label>
                      <Input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Display name</label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Role</label>
                    <select
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      {assignableRoles.map((role) => (
                        <option key={role.role_key} value={role.role_key}>
                          {role.role_label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={createUser.isPending}>
                    {createUser.isPending ? "Creating…" : "Add user"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

        </div>
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  return requirePermission(ctx, "admin.access");
}
