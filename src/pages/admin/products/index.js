import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import { apiFetch } from "../../../lib/api/apiFetch";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../../components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { proxyGhlImageUrl } from "../../../lib/admin/ghl-image";
import { useDebouncedValue } from "../../../lib/hooks/useDebounce";

const initialCatalogProduct = {
  name: "",
  sku: "",
  description: "",
  amount: 0,
  productType: "SERVICE",
  image: "",
};

export default function AdminProducts({ authContext }) {
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogForm, setCatalogForm] = useState(initialCatalogProduct);
  const [catalogSearch, setCatalogSearch] = useState("");
  const debouncedSearch = useDebouncedValue(catalogSearch, 300);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogError, setCatalogError] = useState(null);

  const fetchCatalog = useCallback(async (search = "") => {
    try {
      setCatalogLoading(true);
      setCatalogError(null);
      const params = new URLSearchParams({
        limit: "500",
        excludeCalculator: "1",
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const data = await apiFetch(`/api/products/ghl?${params.toString()}`);
      const rows = Array.isArray(data?.items) ? data.items : [];
      setCatalogItems(rows);
    } catch (e) {
      setCatalogError(e.message);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(debouncedSearch);
  }, [debouncedSearch, fetchCatalog]);

  async function submitCatalog(e) {
    e.preventDefault();
    try {
      setCatalogSaving(true);
      setCatalogError(null);
      const data = await apiFetch("/api/products/ghl", {
        method: "POST",
        body: {
          name: catalogForm.name.trim(),
          sku: catalogForm.sku.trim(),
          description: catalogForm.description.trim(),
          amount: Number(catalogForm.amount) || 0,
          productType: catalogForm.productType,
          image: catalogForm.image.trim(),
          currency: "AUD",
        },
      });
      if (!data?.ok || !data?.item) {
        throw new Error(data?.err || "Create failed");
      }
      toast.success(`Created ${data.item.name} in GHL and local catalog`);
      setCatalogForm(initialCatalogProduct);
      setCatalogItems((prev) => {
        const without = prev.filter((p) => p.id !== data.item.id);
        return [data.item, ...without];
      });
      await fetchCatalog(debouncedSearch);
    } catch (e) {
      setCatalogError(e.message);
      toast.error(e.message || "Failed to create product");
    } finally {
      setCatalogSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Admin • Products</title>
      </Head>
      <AdminLayout title="Products" authContext={authContext}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add GHL catalog product</CardTitle>
              <CardDescription>
                Creates in GoHighLevel and saves to the local product cache (Quick Quote + estimates).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {catalogError ? <p className="mb-4 text-sm text-error">{catalogError}</p> : null}
              <form onSubmit={submitCatalog} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs text-muted-foreground">Name</label>
                  <Input
                    className="mt-1"
                    value={catalogForm.name}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground">SKU</label>
                    <Input
                      className="mt-1"
                      value={catalogForm.sku}
                      onChange={(e) => setCatalogForm((p) => ({ ...p, sku: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground">Price (AUD, inc GST)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="mt-1"
                      value={catalogForm.amount}
                      onChange={(e) => setCatalogForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Description</label>
                  <Input
                    className="mt-1"
                    value={catalogForm.description}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground">Product type</label>
                    <Select
                      value={catalogForm.productType}
                      onValueChange={(value) => setCatalogForm((p) => ({ ...p, productType: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SERVICE">Service</SelectItem>
                        <SelectItem value="PHYSICAL">Physical</SelectItem>
                        <SelectItem value="DIGITAL">Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground">Image URL</label>
                    <Input
                      className="mt-1"
                      value={catalogForm.image}
                      onChange={(e) => setCatalogForm((p) => ({ ...p, image: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <Button type="submit" disabled={catalogSaving}>
                  {catalogSaving ? "Creating…" : "Create in GHL + catalog"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Catalog products</CardTitle>
                  <CardDescription>From local DB (synced with GHL).</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCatalog(debouncedSearch)}
                  disabled={catalogLoading}
                >
                  <RefreshCw className={`mr-1 h-3.5 w-3.5 ${catalogLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search name, SKU…"
                className="mb-3"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <div className="mb-2 text-xs text-muted-foreground">
                {catalogItems.length} products
              </div>
              <div className="divide-y divide-border rounded-md border border-border/60 bg-card/30 text-sm max-h-[32rem] overflow-y-auto">
                {catalogItems.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxyGhlImageUrl(p.image)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded border border-border object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded border border-border bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sku || "—"} • AU${Number(p.amount ?? 0).toFixed(2)} • <code>{p.id}</code>
                      </p>
                    </div>
                  </div>
                ))}
                {catalogItems.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    {catalogLoading ? "Loading…" : "No catalog products yet."}
                  </div>
                ) : null}
              </div>
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
