import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Search, Plus, Minus, Trash2, Loader2, Package, ShoppingCart, DollarSign, Calculator, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useGhlProducts, useSyncGhlProducts } from '../../lib/react-query/hooks/use-ghl-products';
import { useEstimateLineItems } from '../../hooks/admin/useEstimateLineItems';
import { useCreateCustomQuote } from '../../lib/react-query/hooks/admin';
import { useDebouncedValue } from '../../lib/hooks/useDebounce';
import { DEFAULT_CURRENCY } from '../../lib/admin/constants';
import { proxyGhlImageUrl } from '../../lib/admin/ghl-image';
import { CustomerPicker } from './CustomerPicker';

const GST_RATE = 0.10;
const money = (n, c = DEFAULT_CURRENCY) => `${c} ${(Number(n) || 0).toFixed(2)}`;

/**
 * Quick Quote — two-pane product-driven estimate builder.
 * Left: real GHL product catalog (flat list, search). Right: live estimate preview.
 * Save path reuses useEstimateLineItems + useCreateCustomQuote, so the created
 * estimate is identical to the existing flow (portal-functional, no regression).
 */
export default function QuickQuoteBuilder() {
  const router = useRouter();
  const currency = DEFAULT_CURRENCY;
  const locationId = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || '';

  const {
    editedItems, subtotal, handleAddCustomItem, handleQuantityChange,
    handleRemoveItem, itemsForSave,
  } = useEstimateLineItems({});
  const createMutation = useCreateCustomQuote();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isFetching, refetch } = useGhlProducts({ search: debouncedSearch, enabled: true });
  const syncProducts = useSyncGhlProducts();
  // Cap rendered results so a broad search can't flood the page.
  const products = useMemo(() => (data?.items ?? []).slice(0, 40), [data]);
  const [failedImages, setFailedImages] = useState(() => new Set());

  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [selectedContactId, setSelectedContactId] = useState(null);

  const catalogSource = data?.source || (data?.cached ? 'local' : 'unknown');

  // Prefill from URL when opened from Customers tab (e.g. ?email=…&firstName=…)
  useEffect(() => {
    if (!router.isReady) return;
    const email = Array.isArray(router.query.email) ? router.query.email[0] : router.query.email;
    const firstName = Array.isArray(router.query.firstName) ? router.query.firstName[0] : router.query.firstName;
    const lastName = Array.isArray(router.query.lastName) ? router.query.lastName[0] : router.query.lastName;
    if (!email && !firstName && !lastName) return;
    setCustomer((c) => ({
      ...c,
      email: email?.trim() || c.email,
      firstName: firstName?.trim() || c.firstName,
      lastName: lastName?.trim() || c.lastName,
    }));
  }, [router.isReady, router.query.email, router.query.firstName, router.query.lastName]);

  const handleSelectCustomer = useCallback((contact) => {
    setCustomer({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
    });
    setSelectedContactId(contact.id || null);
  }, []);

  const handleClearCustomer = useCallback(() => {
    setSelectedContactId(null);
    setCustomer({ firstName: '', lastName: '', email: '', phone: '' });
  }, []);

  const updateCustomerField = useCallback((field, value) => {
    setSelectedContactId(null);
    setCustomer((c) => ({ ...c, [field]: value }));
  }, []);

  async function handleSyncCatalog() {
    try {
      await syncProducts.mutateAsync();
      toast.success('Product sync started — prices will fill in over the next few minutes.');
      setTimeout(() => refetch(), 3000);
    } catch (err) {
      toast.error(err?.message || 'Sync failed');
    }
  }

  function productAmount(product) {
    if (product?.amount == null || Number.isNaN(Number(product.amount))) return null;
    return Number(product.amount);
  }

  const tax = useMemo(() => subtotal * GST_RATE, [subtotal]);
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);

  function addProduct(product) {
    const idx = editedItems.findIndex((i) => i.ghlProductId && i.ghlProductId === product.id);
    if (idx >= 0) { handleQuantityChange(idx, 1); return; }
    const amount = productAmount(product) ?? 0;
    handleAddCustomItem({
      name: product.name, description: product.description || '', sku: product.sku || '',
      amount, qty: 1, currency, ghlProductId: product.id, image: product.image || '',
    });
  }

  async function save(asDraft) {
    if (editedItems.length === 0) { toast.error('Add at least one product'); return; }
    if (editedItems.some((i) => Number(i.amount) < 0)) {
      toast.error('Prices cannot be negative');
      return;
    }
    if (!customer.email.trim()) { toast.error('Customer email is required'); return; }
    try {
      await createMutation.mutateAsync({
        title: title.trim() || undefined,
        contactDetails: {
          ...customer,
          ...(selectedContactId ? { id: selectedContactId } : {}),
        },
        items: itemsForSave(currency),
        discount: { type: 'percentage', value: 0 },
        sendNow: false, // always Draft from Quick Quote
        locationId,
      });
      toast.success(asDraft ? 'Draft saved' : 'Estimate created (Draft)');
      if (!asDraft) router.push('/admin/estimates');
    } catch (e) {
      toast.error(e?.message || 'Failed to create estimate');
    }
  }

  const saving = createMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ShoppingCart} label="Selected items" value={editedItems.length} />
        <StatCard icon={DollarSign} label={`Subtotal (ex GST) (${currency})`} value={money(subtotal, '').trim()} />
        <StatCard icon={Calculator} label={`Tax (10%) (${currency})`} value={money(tax, '').trim()} />
        <StatCard icon={DollarSign} label={`Estimated total (${currency})`} value={money(grandTotal, '').trim()} emphasize />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT — choose products */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-neutral-900">1. Choose products</h2>
            <button
              type="button"
              onClick={handleSyncCatalog}
              disabled={syncProducts.isPending}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              title="Refresh product catalog and prices from GHL"
            >
              {syncProducts.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync catalog
            </button>
          </div>
          {catalogSource === 'live' && (
            <p className="mt-1 text-xs text-amber-700">Catalog loading from GHL — run sync for cached prices.</p>
          )}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-9 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            />
            {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />}
          </div>

          <div className="mt-3 max-h-[560px] divide-y divide-neutral-100 overflow-y-auto">
            {isFetching && products.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">Loading products…</p>
            ) : products.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">{debouncedSearch ? `No products match “${debouncedSearch}”.` : 'No products found.'}</p>
            ) : (
              products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  {p.image && !failedImages.has(p.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxyGhlImageUrl(p.image)} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded border border-neutral-200 object-cover" onError={() => setFailedImages((s) => new Set(s).add(p.id))} />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded border border-neutral-200 text-neutral-400"><Package className="h-5 w-5" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                    {(p.sku || p.description) && <p className="truncate text-xs text-neutral-500">{p.sku ? `#${p.sku} · ` : ''}{p.description}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-700">
                    {productAmount(p) != null ? `${currency} ${productAmount(p).toFixed(2)}` : '…'}
                  </span>
                  <button
                    onClick={() => addProduct(p)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT — estimate preview */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">2. Estimate preview</h2>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">Draft</span>
          </div>

          <div className="mt-4 space-y-4">
            <CustomerPicker
              selectedId={selectedContactId}
              selectedLabel={
                selectedContactId
                  ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email
                  : null
              }
              onSelect={handleSelectCustomer}
              onClear={handleClearCustomer}
            />

            <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-neutral-500">Estimate title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Home Alarm System"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Customer email <span className="text-red-500">*</span></label>
              <input value={customer.email} onChange={(e) => updateCustomerField('email', e.target.value)} placeholder="jane@example.com" type="email"
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">First name</label>
              <input value={customer.firstName} onChange={(e) => updateCustomerField('firstName', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Last name</label>
              <input value={customer.lastName} onChange={(e) => updateCustomerField('lastName', e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400" />
            </div>
            </div>
          </div>

          <p className="mt-5 text-sm font-medium text-neutral-700">Selected items ({editedItems.length})</p>
          <div className="mt-2 overflow-x-auto">
            {editedItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">No items yet — add products from the left.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2 text-right">Unit</th>
                    <th className="py-2 px-2 text-right">Line total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {editedItems.map((item, index) => {
                    const qty = Number(item.qty || item.quantity || 1);
                    const amt = Number(item.amount) || 0;
                    return (
                      <tr key={item.id || index}>
                        <td className="py-2 pr-2">
                          <p className="font-medium text-neutral-900">{item.name}</p>
                          {item.sku && <p className="text-xs text-neutral-400">#{item.sku}</p>}
                        </td>
                        <td className="py-2 px-2">
                          <div className="inline-flex items-center rounded-lg border border-neutral-200">
                            <button onClick={() => handleQuantityChange(index, -1)} className="grid h-7 w-7 place-items-center text-neutral-500 hover:bg-neutral-100"><Minus className="h-3.5 w-3.5" /></button>
                            <span className="w-8 text-center tabular-nums">{qty}</span>
                            <button onClick={() => handleQuantityChange(index, 1)} className="grid h-7 w-7 place-items-center text-neutral-500 hover:bg-neutral-100"><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-neutral-700">{amt.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-medium tabular-nums text-neutral-900">{(amt * qty).toFixed(2)}</td>
                        <td className="py-2 text-right">
                          <button onClick={() => handleRemoveItem(index)} className="text-neutral-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-1.5 border-t border-neutral-200 pt-4 text-sm">
            <Row label="Subtotal (ex GST)" value={money(subtotal)} />
            <Row label="Tax (10%)" value={money(tax)} />
            <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-base font-bold text-neutral-900">
              <span>Total ({currency})</span><span className="tabular-nums">{money(grandTotal, '').trim()}</span>
            </div>
          </div>

          <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
            This creates a new estimate in <strong>Draft</strong> status. Review and send it to the customer later from the portal.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => save(true)} disabled={saving}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button onClick={() => save(false)} disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create estimate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, emphasize }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-700"><Icon className="h-4 w-4" /></span>
        <p className="text-xs font-medium text-neutral-500">{label}</p>
      </div>
      <p className={`mt-2 tabular-nums ${emphasize ? 'text-2xl font-bold' : 'text-xl font-semibold'} text-neutral-900`}>{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-neutral-600">
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}
