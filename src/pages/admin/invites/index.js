import Head from "next/head";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useState } from "react";
import { requireAdmin } from "../../../lib/auth/requireAdmin";

export default function AdminInvites({ authContext }) {
  const [q, setQ] = useState("");
  const rows = [].filter((r) => filter(r, q));
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
              <CardDescription>Resend, copy link, revoke.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search customer, estimate…"
                className="w-64"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button variant="outline" size="sm">Refresh</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Estimate</th>
                    <th className="px-3 py-2">Last sent</th>
                    <th className="px-3 py-2">Expires</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{r.customer}</td>
                      <td className="px-3 py-2">{r.estimate}</td>
                      <td className="px-3 py-2">{r.lastSent}</td>
                      <td className="px-3 py-2">{r.expires}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Copy link</Button>
                          <Button variant="ghost" size="sm">Resend</Button>
                          <Button variant="ghost" size="sm">Revoke</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={6}>
                        {q?.trim() ? "No invites match your search." : "No invites yet."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    </>
  );
}

function filter(r, q) {
  if (!q?.trim()) return true;
  const s = q.toLowerCase();
  return r.customer.toLowerCase().includes(s) || r.estimate.toLowerCase().includes(s);
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }
  return { props: { ...(authCheck.props || {}) } };
}

