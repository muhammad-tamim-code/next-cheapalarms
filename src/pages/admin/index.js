import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { TrendingUp, Clock, CheckCircle2, Boxes, AlertTriangle, ArrowRight } from "lucide-react";
import { BRAND } from "../../config/brand";
import AdminLayout from "../../components/admin/layout/AdminLayout";
import { requireAdmin } from "../../lib/auth/requireAdmin";
import { useAdminDashboard, useHealthCheck } from "../../lib/react-query/hooks/admin";

const OverviewTrendChart = dynamic(
  () => import("../../components/admin/OverviewTrendChart"),
  { ssr: false, loading: () => <ChartShell /> }
);

/* ── Neutral, business-agnostic admin Overview ──────────────────────────────
   Renders inside the shared AdminLayout (sidebar + topbar). Page only owns the
   content. Monochrome; semantic colour only where it means something. All
   figures come from real endpoints; nothing is hard-coded. ──────────────── */

// Icon per stat card, matched by the title returned from the API.
const STAT_ICONS = [
  { match: /total/i, Icon: TrendingUp },
  { match: /pending/i, Icon: Clock },
  { match: /accepted/i, Icon: CheckCircle2 },
  { match: /product/i, Icon: Boxes },
];
function iconForStat(title, i) {
  return (STAT_ICONS.find((s) => s.match.test(title || "")) || STAT_ICONS[i % 4]).Icon;
}

// Health service labels, in the order the screenshot shows them.
const HEALTH_LABELS = {
  database: "Database",
  ghl: "GHL",
  servicem8: "ServiceM8",
  stripe: "Stripe",
  xero: "Xero",
};

export default function AdminOverview({ authContext }) {
  const { data, isLoading } = useAdminDashboard();
  const { data: health } = useHealthCheck();

  // Gate the ssr:false chart so server HTML and first client render match
  // (renders the same placeholder until mounted), avoiding hydration mismatch.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const stats = data?.stats ?? [];
  const alerts = data?.alerts ?? [];
  const activity = data?.activity ?? [];

  return (
    <>
      <Head><title>{`${BRAND.name} • Overview`}</title></Head>
      <AdminLayout title="Overview" subtitle="Landing dashboard" authContext={authContext}>
        <div className="space-y-6">
          {/* Stat cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading && stats.length === 0
              ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
              : stats.map((s, i) => <StatCard key={s.title} stat={s} Icon={iconForStat(s.title, i)} />)}
          </section>

          {/* Alerts */}
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-900">{a.title}</p>
                {a.description && <p className="text-sm text-amber-800">{a.description}</p>}
              </div>
              <ArrowRight className="h-5 w-5 text-amber-500" />
            </div>
          ))}

          {/* Chart + activity */}
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {mounted ? <OverviewTrendChart /> : <ChartShell />}
            </div>
            <ActivityCard items={activity} />
          </section>

          {/* System health */}
          <HealthCard health={health} />
        </div>
      </AdminLayout>
    </>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ stat, Icon }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-500">{stat.title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{stat.value}</p>
          {stat.hint && <p className="mt-1 text-sm text-neutral-500">{stat.hint}</p>}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
function StatSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-neutral-100" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}

/* ── Chart loading placeholder (shown while the chart chunk loads) ──────── */
function ChartShell() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 h-5 w-32 animate-pulse rounded bg-neutral-100" />
      <div className="grid h-[280px] place-items-center text-sm text-neutral-400">Loading…</div>
    </div>
  );
}

/* ── Recent activity (real data: dashboard.activity) ────────────────────── */
function ActivityCard({ items }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Recent activity</h2>
        <Link href="/admin/estimates" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">View all</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">No recent activity</p>
      ) : (
        <ul className="space-y-4">
          {items.map((a, i) => (
            <li key={i} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.title}</p>
                {a.description && <p className="truncate text-sm text-neutral-500">{a.description}</p>}
              </div>
              {a.when && <span className="shrink-0 text-xs text-neutral-400">{a.when}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── System health (real data: /api/admin/health) ──────────────────────── */
function HealthCard({ health }) {
  const checks = health?.checks ?? {};
  const overall = health?.status; // "healthy" | "degraded" | "down"
  const services = Object.keys(HEALTH_LABELS).filter((k) => checks[k]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">System health</h2>
        {overall && (
          <span
            className={[
              "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              overall === "healthy" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
            ].join(" ")}
          >
            {overall}
          </span>
        )}
      </div>
      {services.length === 0 ? (
        <p className="text-sm text-neutral-500">Health data unavailable</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {services.map((k) => {
            const ok = (checks[k]?.status ?? checks[k]) === "ok" || checks[k]?.status === "healthy";
            return (
              <div key={k} className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-100 py-3">
                <span className={["h-2.5 w-2.5 rounded-full", ok ? "bg-emerald-500" : "bg-red-500"].join(" ")} />
                <span className="text-sm text-neutral-600">{HEALTH_LABELS[k]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) return authCheck;
  return { props: { ...(authCheck.props || {}) } };
}
