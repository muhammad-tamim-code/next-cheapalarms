import { useEffect, useState } from "react";
import Head from "next/head";
import { apiFetch } from "../../../lib/api/apiFetch";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../../components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { toast } from "sonner";

const initialProduct = {
  type: "base",
  name: "",
  brand: "",
  status: "active",
  price: { oneOffExGst: 0, installExGst: 0 },
  gstRate: 0.1,
  installMinutes: 0,
  tags: [],
  attributes: {},
  // base
  addons: [],
  // addon
  maxQtyPerSite: undefined,
  // package
  baseId: "",
  components: [],
};

export default function AdminProducts({ authContext }) {
  const [items, setItems] = useState([]);
  const [baseItems, setBaseItems] = useState([]);
  const [addonItems, setAddonItems] = useState([]);
  const [packageItems, setPackageItems] = useState([]);
  const [tab, setTab] = useState("base"); // base|addons|packages
  const [form, setForm] = useState(initialProduct);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [baseInput, setBaseInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Switch instantly using cached results; no network roundtrip on tab change
    if (tab === "base") setItems(baseItems);
    else if (tab === "addons") setItems(addonItems);
    else setItems(packageItems);
  }, [tab, baseItems, addonItems, packageItems]);

  async function fetchAll() {
    try {
      setLoadingLists(true);
      setError(null);
      const [b, a, p] = await Promise.all([
        apiFetch("/api/products/base"),
        apiFetch("/api/products/addons"),
        apiFetch("/api/products/packages"),
      ]);
      setBaseItems(Array.isArray(b) ? b : []);
      setAddonItems(Array.isArray(a) ? a : []);
      setPackageItems(Array.isArray(p) ? p : []);
      // Set visible list according to current tab
      if (tab === "base") setItems(Array.isArray(b) ? b : []);
      else if (tab === "addons") setItems(Array.isArray(a) ? a : []);
      else setItems(Array.isArray(p) ? p : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingLists(false);
    }
  }

  function update(path, value) {
    setForm((prev) => {
      const next = structuredClone(prev);
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  function addBaseAddon() {
    setForm((prev) => ({ ...prev, addons: [...(prev.addons || []), { addonId: "", minQty: 0, maxQty: 0, defaultQty: 0 }] }));
  }
  function addPackageComponent() {
    setForm((prev) => ({
      ...prev,
      components: [...(prev.components || []), { addonId: "", minQty: 0, maxQty: 0, defaultQty: 0, powerDrawmA: undefined }],
    }));
  }
  function removeBaseAddon(idx) {
    setForm((prev) => {
      const next = { ...prev, addons: [...(prev.addons || [])] };
      next.addons.splice(idx, 1);
      return next;
    });
  }
  function removePackageComponent(idx) {
    setForm((prev) => {
      const next = { ...prev, components: [...(prev.components || [])] };
      next.components.splice(idx, 1);
      return next;
    });
  }
  function clearPackageBase() {
    setForm((prev) => ({ ...prev, baseId: "" }));
    setBaseInput("");
  }
  function confirmPackageBase() {
    setForm((prev) => ({ ...prev, baseId: String(baseInput || "").trim() }));
  }
  // Keep the local input in sync when baseId changes externally (e.g., after save/reset)
  useEffect(() => {
    if ((form.baseId || "") !== baseInput) {
      setBaseInput(form.baseId || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.baseId]);

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload = sanitize(form);
      const data = await apiFetch("/api/products", {
        method: "POST",
        body: payload,
      });
      if (!data?.ok) throw new Error(data?.message || data?.err || "Save failed");
      setForm(initialProduct);
      await fetchAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick(id) {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function remove(id) {
    try {
      await apiFetch(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      toast.error(err?.response?.message ?? err?.response?.err ?? err?.message ?? "Delete failed");
      return;
    }
    await fetchAll();
    setDeleteDialogOpen(false);
    setProductToDelete(null);
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
              <CardTitle>Add / Update product</CardTitle>
              <CardDescription>Single form with type-specific fields.</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? <p className="mb-4 text-sm text-error">{error}</p> : null}
              <form onSubmit={submit} className="space-y-4 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground">Type</label>
                    <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="base">base</SelectItem>
                        <SelectItem value="addon">addon</SelectItem>
                        <SelectItem value="package">package</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground">Status</label>
                    <Select value={form.status} onValueChange={(value) => update("status", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="inactive">inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground">Name</label>
                    <Input
                      className="mt-1"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground">Brand</label>
                    <Input
                      className="mt-1"
                      value={form.brand || ""}
                      onChange={(e) => update("brand", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground">Price (ex GST)</label>
                    <Input
                      type="number"
                      step="0.01"
                      className="mt-1"
                      value={form.price.oneOffExGst}
                      onChange={(e) => update("price.oneOffExGst", parseFloat(e.target.value || "0"))}
                    />
                  </div>
                  {form.type !== "package" ? null : (
                    <div>
                      <label className="block text-xs text-muted-foreground">GST rate</label>
                      <Input
                        type="number"
                        step="0.01"
                        className="mt-1"
                        value={form.gstRate}
                        onChange={(e) => update("gstRate", parseFloat(e.target.value || "0.1"))}
                      />
                    </div>
                  )}
                </div>

                {form.type === "package" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-xs text-muted-foreground">Install minutes</label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={form.installMinutes}
                        onChange={(e) => update("installMinutes", parseInt(e.target.value || "0", 10))}
                      />
                    </div>
                  </div>
                ) : null}

                {form.type === "addon" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs text-muted-foreground">Max qty per site</label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={form.maxQtyPerSite || 0}
                        onChange={(e) => update("maxQtyPerSite", parseInt(e.target.value || "0", 10))}
                      />
                    </div>
                  </div>
                ) : null}

                {/* No addons section on base form by design */}

                {form.type === "package" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Base</label>
                        {form.baseId ? (
                          <Button type="button" variant="ghost" size="sm" onClick={clearPackageBase}>
                            Remove base
                          </Button>
                        ) : null}
                      </div>
                      {form.baseId ? (
                        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                          <span className="text-muted-foreground">Selected base</span>
                          <span className="font-medium text-foreground">{form.baseId}</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter baseId (e.g., base_ajax_hub2_4g)"
                            value={baseInput}
                            onChange={(e) => setBaseInput(e.target.value)}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={confirmPackageBase} disabled={!baseInput.trim()}>
                            Set base
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Components</label>
                      <Button type="button" variant="outline" size="sm" onClick={addPackageComponent}>
                        Add component
                      </Button>
                    </div>
                    <div className="hidden grid-cols-7 gap-2 text-xs text-muted-foreground md:grid">
                      <span>Addon ID</span>
                      <span>Min qty</span>
                      <span>Max qty</span>
                      <span>Default qty</span>
                      <span>Power (mA)</span>
                      <span>Notes</span>
                      <span>Actions</span>
                    </div>
                    {(form.components || []).map((row, idx) => (
                      <div key={idx} className="grid grid-cols-2 items-start gap-2 md:grid-cols-7">
                        <Input
                          placeholder="addonId"
                          value={row.addonId}
                          onChange={(e) => update(`components.${idx}.addonId`, e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="min qty"
                          value={row.minQty}
                          onChange={(e) => update(`components.${idx}.minQty`, parseInt(e.target.value || "0", 10))}
                        />
                        <Input
                          type="number"
                          placeholder="max qty"
                          value={row.maxQty}
                          onChange={(e) => update(`components.${idx}.maxQty`, parseInt(e.target.value || "0", 10))}
                        />
                        <Input
                          type="number"
                          placeholder="default qty"
                          value={row.defaultQty}
                          onChange={(e) => update(`components.${idx}.defaultQty`, parseInt(e.target.value || "0", 10))}
                        />
                        <Input
                          type="number"
                          placeholder="powerDraw mA"
                          value={row.powerDrawmA || 0}
                          onChange={(e) => update(`components.${idx}.powerDrawmA`, parseInt(e.target.value || "0", 10))}
                        />
                        <Input
                          placeholder="notes"
                          value={row.notes || ""}
                          onChange={(e) => update(`components.${idx}.notes`, e.target.value)}
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePackageComponent(idx)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save product"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Existing products</CardTitle>
                  <CardDescription>Fetched from WordPress API via proxy.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1 text-xs shadow-sm">
                  {[
                    { key: "base", label: "Base" },
                    { key: "addons", label: "Addons" },
                    { key: "packages", label: "Packages" },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      variant={tab === key ? "default" : "ghost"}
                      size="sm"
                      className="rounded-full"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search name, brand, ID…"
                    className="w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={fetchAll} disabled={loadingLists}>
                    {loadingLists ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
              </div>
              <div className="mb-2 text-xs text-muted-foreground">
                {items.filter((p) => filterMatch(p, search)).length} {tab === "base" ? "Base" : tab === "addons" ? "Addons" : "Packages"}
              </div>
              <div className="divide-y divide-border rounded-md border border-border/60 bg-card/30 text-sm">
                {items.filter((p) => filterMatch(p, search)).map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-muted/30">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">
                        {p.name}{" "}
                        <span className="text-xs uppercase text-muted-foreground">
                          [{p.type === "base" ? "Base" : p.type === "addon" ? "Addon" : "Package"}] • <code>{p.id}</code>
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.brand || "—"} • exGST ${Number(p?.price?.oneOffExGst ?? 0).toFixed(2)} • GST {Number(p?.gstRate ?? 0).toFixed(2)}
                      </p>
                      {p.type === "package" ? (
                        <p className="text-xs text-muted-foreground">
                          base: <code>{p.baseId}</code> • components: {(p.components || []).length}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {items.filter((p) => filterMatch(p, search)).length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">No results match your search.</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => productToDelete && remove(productToDelete)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminLayout>
    </>
  );
}

function sanitize(input) {
  const out = { ...input };
  // Ensure numeric types are numbers
  out.price = {
    oneOffExGst: Number(input.price?.oneOffExGst || 0),
    installExGst: 0,
  };
  if (out.type === "package") {
    out.gstRate = Number(input.gstRate || 0.1);
    out.installMinutes = Number(input.installMinutes || 0);
  } else {
    out.gstRate = Number(input.gstRate || 0.1);
    out.installMinutes = 0;
  }
  // Clean arrays for type
  if (out.type === "base") {
    delete out.addons;
    delete out.components;
    delete out.baseId;
    delete out.maxQtyPerSite;
  } else if (out.type === "addon") {
    delete out.maxQtyPerSite;
    delete out.addons;
    delete out.components;
    delete out.baseId;
  } else if (out.type === "package") {
    out.baseId = String(out.baseId || "");
    out.components = (out.components || []).map((r) => ({
      addonId: String(r.addonId || ""),
      minQty: Number(r.minQty || 0),
      maxQty: Number(r.maxQty || 0),
      defaultQty: Number(r.defaultQty || 0),
      powerDrawmA: r.powerDrawmA != null ? Number(r.powerDrawmA) : undefined,
      notes: r.notes || undefined,
    }));
    delete out.addons;
    delete out.maxQtyPerSite;
  }
  return out;
}

function filterMatch(p, q) {
  if (!q || !q.trim()) return true;
  const s = q.toLowerCase();
  return (
    String(p.name || "").toLowerCase().includes(s) ||
    String(p.brand || "").toLowerCase().includes(s) ||
    String(p.id || "").toLowerCase().includes(s)
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }
  return { props: { ...(authCheck.props || {}) } };
}

