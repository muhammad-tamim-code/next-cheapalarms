import { useState } from "react";
import { X } from "lucide-react";

/**
 * Create a new GHL contact from the Customers tab.
 */
export function NewContactModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Email or phone is required.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setForm({ firstName: "", lastName: "", email: "", phone: "" });
    } catch (err) {
      setError(err?.message || "Failed to create contact");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">New contact</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" name="firstName" value={form.firstName} onChange={handleChange} />
            <Field label="Last name" name="lastName" value={form.lastName} onChange={handleChange} />
          </div>
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
          <p className="text-xs text-neutral-500">
            Creates a contact in GoHighLevel. Send a quote from Quick Quote to add an estimate.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-neutral-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />
    </div>
  );
}

NewContactModal.displayName = "NewContactModal";
