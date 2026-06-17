import Head from "next/head";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import AdminLayout from "../../components/admin/layout/AdminLayout";
import { AlertsStrip } from "../../components/admin/ui/AlertsStrip";
import { CardStat } from "../../components/admin/ui/CardStat";
import { ActivityList } from "../../components/admin/ui/ActivityList";
import { HealthStatusCard } from "../../components/admin/HealthStatusCard";
import { requireAdmin } from "../../lib/auth/requireAdmin";
import { Spinner } from "../../components/ui/spinner";
import { useAdminDashboard } from "../../lib/react-query/hooks/admin";

const AdminEstimatesOverviewChart = dynamic(
  () =>
    import("../../components/admin/AdminEstimatesOverviewChart").then(
      (m) => m.AdminEstimatesOverviewChart
    ),
  { ssr: false }
);

export default function AdminOverview({ authContext }) {
  const { data, isLoading, error } = useAdminDashboard();

  const stats = useMemo(() => data?.stats ?? [], [data?.stats]);
  const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);
  const activity = useMemo(() => data?.activity ?? [], [data?.activity]);

  return (
    <>
      <Head>
        <title>Superadmin • Overview</title>
      </Head>
      <AdminLayout title="Overview" authContext={authContext}>
        {error && (
          <div className="mb-4 rounded-md border border-error/30 bg-error-bg p-4 text-sm text-error">
            <p className="font-semibold">Error loading dashboard data</p>
            <p className="mt-1">{error?.message || "Failed to load admin dashboard"}</p>
          </div>
        )}
        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Spinner size="sm" />
              Loading dashboard…
            </div>
          </div>
        ) : (
          <>
            {alerts && alerts.length > 0 && <AlertsStrip items={alerts} />}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats?.map((s) => (
            <CardStat key={s.title} title={s.title} value={s.value} hint={s.hint} />
          ))}
        </section>
        <section className="mt-6">
          <AdminEstimatesOverviewChart />
        </section>
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-foreground">Quick actions</p>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <ActionLink label="Add product" href="/admin/products" />
              <ActionLink label="Create package" href="/admin/products" />
              <ActionLink label="Resend invite" href="/admin/invites" />
              <ActionLink label="Sync GHL" href="/admin/integrations" />
            </div>
          </div>
          {activity && activity.length > 0 ? (
            <ActivityList items={activity} />
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Recent activity</p>
              <p className="mt-2 text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </section>
        <section className="mt-6">
          <HealthStatusCard showRefreshButton={true} autoRefresh={true} />
        </section>
          </>
        )}
      </AdminLayout>
    </>
  );
}

function ActionLink({ label, href }) {
  return (
    <a className="rounded-md border border-border/60 bg-background px-3 py-2 text-foreground transition hover:bg-muted/40" href={href}>
      {label}
    </a>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }

  // SSR should be auth-only to avoid blocking TTFB on WordPress/GHL calls.
  return { props: { ...(authCheck.props || {}) } };
}
