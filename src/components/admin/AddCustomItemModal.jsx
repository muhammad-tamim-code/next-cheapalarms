import { useState } from 'react';
import { Search, Package, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { DEFAULT_CURRENCY } from '../../lib/admin/constants';
import { proxyGhlImageUrl } from '../../lib/admin/ghl-image';
import { Modal } from './Modal';
import { toast } from 'sonner';
import { useGhlProducts } from '../../lib/react-query/hooks/use-ghl-products';
import { useDebouncedValue } from '../../lib/hooks/useDebounce';

/**
 * Modal for adding a line item to an estimate.
 * Two ways to fill it:
 *  1. Search the GHL product catalog and pick a product (prefills name/SKU/description/price).
 *  2. Type a fully custom item.
 * The onAdd contract is unchanged ({ name, description, qty, amount, currency, isCustom, photoRequired })
 * with added optional { sku, ghlProductId } so future estimate sync can link the product.
 */
export function AddCustomItemModal({ isOpen, onClose, onAdd, currency = DEFAULT_CURRENCY }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState('');
  const [photoRequired, setPhotoRequired] = useState(false);
  const [ghlProductId, setGhlProductId] = useState(null);
  const [image, setImage] = useState('');

  // Catalog search
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isFetching } = useGhlProducts({
    search: debouncedSearch,
    enabled: isOpen && debouncedSearch.trim().length >= 2,
  });
  const results = (data?.items ?? []).slice(0, 25);

  const resetForm = () => {
    setName(''); setDescription(''); setSku(''); setQty(1); setAmount('');
    setPhotoRequired(false); setGhlProductId(null); setSearch(''); setImage('');
  };

  const handlePick = (product) => {
    setName(product.name || '');
    setDescription(product.description || '');
    setSku(product.sku || '');
    setGhlProductId(product.id || null);
    setImage(product.image || '');
    setSearch('');

    if (product.amount != null && !Number.isNaN(Number(product.amount))) {
      setAmount(String(product.amount));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Item name is required');
      return;
    }
    const numAmount = parseFloat(amount) || 0;
    const numQty = parseInt(qty, 10) || 1;
    if (numAmount < 0) {
      toast.error('Unit price cannot be negative');
      return;
    }
    onAdd({
      name: name.trim(),
      description: description.trim(),
      sku: sku.trim() || undefined,
      ghlProductId: ghlProductId || undefined,
      image: image || undefined,
      qty: numQty,
      amount: numAmount,
      currency,
      isCustom: !ghlProductId,
      photoRequired,
    });
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const total = (parseFloat(amount) || 0) * (parseInt(qty, 10) || 1);

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Add item">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Catalog picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Search product catalog (GHL)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type at least 2 characters…"
              className="pl-9"
            />
            {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          {debouncedSearch.trim().length >= 2 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
              {results.length === 0 && !isFetching ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">No products match “{debouncedSearch}”.</p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePick(p)}
                    className="flex w-full items-start gap-3 border-b border-border/60 px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proxyGhlImageUrl(p.image)} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded border border-border object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <Package className="mt-0.5 h-8 w-8 shrink-0 rounded border border-border p-1.5 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                      {(p.sku || p.description) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.sku ? `#${p.sku} · ` : ''}{p.description}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Pick a product to prefill the fields, or just type a custom item below.</p>
        </div>

        <div className="border-t border-border/60" />

        {/* Item Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Item Name <span className="text-error">*</span>
            {ghlProductId && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">from catalog</span>}
          </label>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Additional cabling" required />
        </div>

        {/* SKU */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">SKU</label>
          <Input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., 50 feet CAT6 cable" rows={2} />
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Quantity</label>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" step="1" />
        </div>

        {/* Unit Price */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Unit Price ({currency}) <span className="text-error">*</span>
          </label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" required />
        </div>

        {/* Photo Required */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Checkbox id="photoRequired" checked={photoRequired} onChange={(e) => setPhotoRequired(e.target.checked)} className="mt-0.5" />
          <label htmlFor="photoRequired" className="cursor-pointer text-sm">
            <span className="font-medium text-foreground">Require customer photos</span>
            <p className="mt-0.5 text-xs text-muted-foreground">Check if the customer must upload photos for this item.</p>
          </label>
        </div>

        {/* Total */}
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total:</span>
            <span className="text-lg font-bold text-foreground">{currency} {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button type="button" onClick={handleCancel} variant="outline" className="flex-1">Cancel</Button>
          <Button type="submit" variant="gradient" className="flex-1">Add Item</Button>
        </div>
      </form>
    </Modal>
  );
}
