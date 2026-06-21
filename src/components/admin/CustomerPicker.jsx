import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useGHLContactsList } from "../../lib/react-query/hooks/use-customers";
import { useDebouncedValue } from "../../lib/hooks/useDebounce";
import {
  getContactDisplayName,
  getAvatarColorClass,
  getContactInitials,
} from "../../lib/admin/customers-utils";

/**
 * Searchable GHL contact picker — selecting a row fills customer fields.
 */
export function CustomerPicker({ selectedId, selectedLabel, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const containerRef = useRef(null);

  const { data, isFetching } = useGHLContactsList({
    search: debouncedQuery,
    limit: 25,
    enabled: open && debouncedQuery.trim().length >= 1,
  });

  const contacts = data?.contacts ?? [];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  function handlePick(contact) {
    onSelect({
      id: contact.id,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
    });
    setQuery("");
    close();
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-neutral-500">
        Existing customer
      </label>
      {selectedId ? (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-neutral-800">
              {selectedLabel || "Customer selected"}
            </span>
            {selectedLabel && (
              <span className="truncate text-xs text-neutral-500">Fields filled below</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800"
            aria-label="Clear selected customer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-9 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              autoComplete="off"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
            )}
          </div>

          {open && debouncedQuery.trim().length >= 1 && (
            <ul
              className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              {isFetching && contacts.length === 0 ? (
                <li className="px-3 py-2 text-sm text-neutral-400">Searching…</li>
              ) : contacts.length === 0 ? (
                <li className="px-3 py-2 text-sm text-neutral-400">
                  No customers match &ldquo;{debouncedQuery}&rdquo;
                </li>
              ) : (
                contacts.map((contact) => (
                  <li key={contact.id} role="option">
                    <button
                      type="button"
                      onClick={() => handlePick(contact)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50"
                    >
                      <div
                        className={[
                          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                          getAvatarColorClass(contact.id),
                        ].join(" ")}
                      >
                        {getContactInitials(contact)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {getContactDisplayName(contact)}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {[contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {open && debouncedQuery.trim().length === 0 && query.length > 0 && (
            <p className="mt-1 text-xs text-neutral-400">Keep typing to search…</p>
          )}
        </>
      )}
    </div>
  );
}

CustomerPicker.displayName = "CustomerPicker";
