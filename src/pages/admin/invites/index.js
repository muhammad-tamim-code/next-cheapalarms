import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Spinner } from "../../../components/ui/spinner";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { useAdminEstimates } from "../../../lib/react-query/hooks/admin/use-admin-estimates";
import { useSendEstimate } from "../../../lib/react-query/hooks/admin/use-admin-estimate-actions";
import { RefreshCw } from "lucide-react";

/** Portal-status values that indicate an invite has actually been sent. */
const SENT_STATUSES = new Set(["sent", "accepted", "rejected"]);

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusBadge(portalStatus) {
  switch (portalStatus) {
    case "accepted":
      return { label: "Accepted", variant: "default" };
    case "rejected":
      return { label: "Rejected", variant: "destructive" };
    case "sent":
      return { label: "Sent", variant: "secondary" };
    default:
      return { label: portalStatus || "Pending", variant: "outline" };
  }
}

export default function AdminInvites({ authContext }) {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch, isRefetching } = useAdminEstimates({
    pageSize: 100,
  });
  const sendEstimate = useSendEstimate();
  const [resendingId, setResendingId] = useState(null);

  const estimates = data?.estimates || data?.items || [];

  const invites = useMemo(() => {
    const sent = estimates.filter((e) => {
      const ps = e.portalStatus || e.ghlStatus;
      return SENT_STATUSES.has(ps);
    });

    if (!search.trim()) return sent;

    const needle = search.trim().toLowerCase();
    return sent.filter((e) => {
      return (
        (e.contactName || "").toLowerCase().includes(needle) ||
        (e.contactEmail || "").toLowerCase().includes(needle) ||
        (e.estimateNumber || "").toLowerCase().includes(needle) ||
        (e.id || "").toLowerCase().includes(needle)
      );
    });
  }, [estimates, search]);

  const handleResend = async (estimate) => {
    setResendingId(estimate.id);
    try {
      await sendEstimate.mutateAsync({
        estimateId: estimate.id,
        locationId: estimate.locationId,
        method: "email",
      });
      toast.success(`Invite resent to ${estimate.contactEmail || "customer"}`);
    } catch (e) {
      toast.error(e?.message || "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Superadmin • Invites</title>
      </Head>
      <AdminLayout title="Invites" authContext={authContext}>
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Portal invites</CardTitle>
              <CardDescription>
                Estimates that have been sent to customers. Resend the email to retry delivery.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search customer, email, estimate…"
                className="w-72"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Estimate</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Last updated</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {error ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-xs text-error" colSpan={6}>
                        Failed to load estimates. {error?.message || ""}{" "}
                        <button type="button" className="underline" onClick={() => refetch()}>
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : isLoading ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={6}>
                        <span className="inline-flex items-center gap-2">
                          <Spinner size="sm" />
                          Loading invites…
                        </span>
                      </td>
                    </tr>
                  ) : invites.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={6}>
                        {search.trim() ? "No invites match your search." : "No invites sent yet."}
                      </td>
                    </tr>
                  ) : (
                    invites.map((est) => {
                      const badge = statusBadge(est.portalStatus || est.ghlStatus);
                      const isResending = resendingId === est.id;
                      return (
                        <tr key={est.id} className="border-t border-border/60">
                          <td className="px-3 py-2">{est.contactName || "—"}</td>
                          <td className="px-3 py-2">{est.contactEmail || "—"}</td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/admin/estimates/${est.id}`}
                              className="font-mono text-xs underline-offset-2 hover:underline"
                            >
                              #{est.estimateNumber || est.id}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {formatDate(est.updatedAt || est.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/admin/estimates/${est.id}`}>View</Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResend(est)}
                                disabled={isResending || !est.contactEmail}
                                title={!est.contactEmail ? "No customer email on file" : "Resend invite email"}
                              >
                                {isResending ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Spinner size="sm" />
                                    Sending…
                                  </span>
                                ) : (
                                  "Resend"
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
