import Head from "next/head";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useState } from "react";
import { requirePermission } from "../../../lib/auth/requirePermission";
import { GhlIntegrationCard } from "../../../components/admin/settings/GhlIntegrationCard";
import { StripeIntegrationCard } from "../../../components/admin/settings/StripeIntegrationCard";

export default function AdminSettings({ authContext }) {
  const [gstRate, setGstRate] = useState(0.1);
  const [jwtTtl, setJwtTtl] = useState(3600);
  const [cors, setCors] = useState(["http://localhost:3000"]);

  function addOrigin() {
    setCors((prev) => [...prev, ""]);
  }
  function updateOrigin(i, v) {
    setCors((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }
  function removeOrigin(i) {
    setCors((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <Head>
        <title>Superadmin • Settings</title>
      </Head>
      <AdminLayout title="Settings" authContext={authContext}>
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <GhlIntegrationCard />
          <StripeIntegrationCard />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tax & Pricing</CardTitle>
              <CardDescription>Configure GST and other pricing defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-muted-foreground">GST rate</label>
                <Input
                  type="number"
                  step="0.01"
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value || "0"))}
                  className="mt-1 w-40"
                />
              </div>
              <Button variant="outline" size="sm">Save</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>JWT session settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-muted-foreground">JWT TTL (seconds)</label>
                <Input
                  type="number"
                  value={jwtTtl}
                  onChange={(e) => setJwtTtl(parseInt(e.target.value || "0", 10))}
                  className="mt-1 w-40"
                />
              </div>
              <Button variant="outline" size="sm">Save</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CORS</CardTitle>
              <CardDescription>Allowed origins for API requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                {cors.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={o}
                      onChange={(e) => updateOrigin(i, e.target.value)}
                      placeholder="https://example.com"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeOrigin(i)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOrigin}>
                  Add origin
                </Button>
              </div>
              <Button variant="outline" size="sm">Save</Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  return requirePermission(ctx, "settings.manage");
}

