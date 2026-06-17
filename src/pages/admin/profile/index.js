import Head from "next/head";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import {
  UserCircle,
  Mail,
  Shield,
  Key,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/router";
import { useCallback } from "react";

export default function AdminProfile({ authContext }) {
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Even if logout API fails, redirect to login
    }
    router.push("/login");
  }, [router]);

  // Guard: authContext is always provided via requireAdmin, but be safe
  const user = authContext ?? {};

  // Generate initials for avatar fallback
  const initials = (user.displayName || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <Head>
        <title>Superadmin &bull; Profile</title>
      </Head>
      <AdminLayout title="Profile" authContext={authContext}>
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                {/* Avatar */}
                <div className="shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName || "Avatar"}
                      className="h-20 w-20 rounded-full border-2 border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-primary-foreground">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Name + Email */}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-semibold text-foreground">
                    {user.displayName || "—"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user.email || "—"}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {user.roleLabel && (
                      <Badge variant="default" className="text-xs">
                        {user.roleLabel}
                      </Badge>
                    )}
                    {user.isAdmin && !user.roleLabel && (
                      <Badge variant="default" className="text-xs">
                        Admin
                      </Badge>
                    )}
                    {(user.roles ?? [])
                      .filter((role) => !["administrator", "ca_admin", "ca_superadmin"].includes(role))
                      .map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                Account Details
              </CardTitle>
              <CardDescription>
                Your account information as configured in WordPress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between py-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <UserCircle className="h-4 w-4" />
                    Display Name
                  </dt>
                  <dd className="font-medium text-foreground">
                    {user.displayName || "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </dt>
                  <dd className="font-medium text-foreground">
                    {user.email || "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Key className="h-4 w-4" />
                    User ID
                  </dt>
                  <dd className="font-mono text-xs text-foreground">
                    {user.id ?? "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Capabilities
                  </dt>
                  <dd className="flex flex-wrap justify-end gap-1">
                    {(user.capabilities ?? []).length > 0
                      ? user.capabilities.map((cap) => (
                          <Badge
                            key={cap}
                            variant="outline"
                            className="text-xs"
                          >
                            {cap}
                          </Badge>
                        ))
                      : <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/20"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
              <p className="text-xs text-muted-foreground">
                To change your password or display name, update your WordPress
                account directly.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }
  return { props: { ...(authCheck.props || {}) } };
}
