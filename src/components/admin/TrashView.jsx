import { useState, useMemo, useCallback } from "react";
import { Trash2, RotateCcw, Eye, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";
import { Skeleton } from "../ui/skeleton";
import { Avatar } from "./Avatar";
import { EstimateActionsMenu } from "./EstimateActionsMenu";
import { FloatingActionBar } from "./FloatingActionBar";
import { RestoreDialog } from "./RestoreDialog";
import { EmptyTrashDialog } from "./EmptyTrashDialog";
import { useRestoreEstimate, useBulkRestoreEstimates, useEmptyTrash } from "../../lib/react-query/hooks/admin";
import { formatTimeAgo } from "../../lib/utils/time-utils";
import { DEFAULT_CURRENCY } from "../../lib/admin/constants";
import { formatEstimateNumber } from "../../lib/admin/format-estimate-number";

/**
 * Trash view component for displaying soft-deleted estimates
 * Includes bulk selection, restore functionality, and enhanced UI
 */
export function TrashView({
  items = [],
  isLoading = false,
  error = null,
  onRetry,
  onViewDetails,
  locationId,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const restoreMutation = useRestoreEstimate();
  const bulkRestoreMutation = useBulkRestoreEstimates();
  const emptyTrashMutation = useEmptyTrash();

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      return (
        item.estimateNumber?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        String(item.id || '').toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  // Handle select all
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredItems]);

  // Handle individual selection
  const handleSelectItem = useCallback((estimateId, checked) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(estimateId);
      } else {
        newSelected.delete(estimateId);
      }
      return newSelected;
    });
  }, []);

  // Handle single restore (quick, no dialog)
  const handleQuickRestore = useCallback(async (estimateId, locId) => {
    // Accept locationId as second param for consistency with EstimateActionsMenu interface
    // But use the prop locationId if locId is not provided (backward compatibility)
    const effectiveLocationId = locId || locationId;
    try {
      await restoreMutation.mutateAsync({ estimateId, locationId: effectiveLocationId });
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(estimateId);
        return newSet;
      });
    } catch (error) {
      // Error handled by mutation - rollback selection if needed
      // The mutation's onError will handle the toast and optimistic update rollback
    }
  }, [restoreMutation, locationId]);

  // Handle bulk restore
  const handleBulkRestore = useCallback(async () => {
    const estimateIds = Array.from(selectedIds);
    if (estimateIds.length === 0) return;

    try {
      await bulkRestoreMutation.mutateAsync({ estimateIds, locationId });
      setSelectedIds(new Set());
      setRestoreDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  }, [selectedIds, bulkRestoreMutation, locationId]);

  // Handle empty trash
  const handleEmptyTrash = useCallback(async () => {
    try {
      await emptyTrashMutation.mutateAsync({ locationId });
      setEmptyTrashDialogOpen(false);
      setSelectedIds(new Set()); // Clear selection after emptying
    } catch (error) {
      // Error handled by mutation
    }
  }, [emptyTrashMutation, locationId]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error-bg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
        <p className="font-semibold text-error mb-2">Error loading trash</p>
        <p className="text-sm text-error/80 mb-4">{error?.message || error?.toString() || "Failed to load deleted estimates"}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (filteredItems.length === 0 && !isLoading && !error) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-muted p-4">
            <Trash2 className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No deleted estimates</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {searchQuery
            ? "No estimates match your search."
            : "Deleted estimates will appear here for 30 days before being permanently deleted."}
        </p>
        {searchQuery && (
          <Button onClick={() => setSearchQuery("")} variant="outline" size="sm">
            Clear search
          </Button>
        )}
      </div>
    );
  }

  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredItems.length;
  // Note: someSelected is available for future use (e.g., indeterminate checkbox state)

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Trash</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Estimates deleted in the last 30 days. After 30 days, they will be permanently deleted.
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setEmptyTrashDialogOpen(true)}
              disabled={emptyTrashMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Empty Trash
            </Button>
          )}
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by number, email, or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search deleted estimates"
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <Checkbox
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quote Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estimate Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Deleted
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Value
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? "bg-primary/5" : "hover:bg-primary/5"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item.id, e.target.checked);
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm text-foreground">
                            {formatEstimateNumber(item.estimateNumber, { fallbackId: item.id }) || item.id || "ESTIMATE"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {formatEstimateNumber(item.estimateNumber, { fallbackId: item.id }) || item.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={item.email || "N/A"}
                            email={item.email}
                            size="md"
                          />
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {item.email || "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.email || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {item.deletedAt ? formatTimeAgo(item.deletedAt) : "—"}
                          </Badge>
                          {item.deletedBy && (
                            <div className="text-xs text-muted-foreground">
                              by {item.deletedBy}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-foreground">
                        {(item.total != null && typeof item.total === 'number' && item.total > 0)
                          ? `${item.currency || DEFAULT_CURRENCY} ${item.total.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickRestore(item.id);
                            }}
                            variant="outline"
                            size="sm"
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                          <EstimateActionsMenu
                            estimateId={item.id}
                            isInTrash={true}
                            onViewDetails={onViewDetails}
                            onRestore={handleQuickRestore}
                            locationId={locationId}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`bg-surface rounded-lg border border-border p-4 shadow-sm transition-all ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground text-sm">
                        {formatEstimateNumber(item.estimateNumber, { fallbackId: item.id }) || item.id || "ESTIMATE"}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      #{formatEstimateNumber(item.estimateNumber, { fallbackId: item.id }) || item.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Avatar
                    name={item.email || "N/A"}
                    email={item.email}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.email || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{item.email || ""}</p>
                  </div>
                </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Deleted</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.deletedAt ? formatTimeAgo(item.deletedAt) : "—"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Value</p>
                        <p className="text-sm font-semibold text-foreground">
                          {(item.total != null && typeof item.total === 'number' && item.total > 0)
                            ? `${item.currency || DEFAULT_CURRENCY} ${item.total.toFixed(2)}`
                            : "—"}
                        </p>
                      </div>
                    </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    onClick={() => handleQuickRestore(item.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={restoreMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                  </Button>
                  <EstimateActionsMenu
                    estimateId={item.id}
                    isInTrash={true}
                    onViewDetails={onViewDetails}
                    onRestore={handleQuickRestore}
                    locationId={locationId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onRestoreSelected={() => setRestoreDialogOpen(true)}
        isLoading={bulkRestoreMutation.isPending}
      />

      {/* Bulk Restore Dialog */}
      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        onConfirm={handleBulkRestore}
        count={selectedIds.size}
        isLoading={bulkRestoreMutation.isPending}
      />

      {/* Empty Trash Dialog */}
      <EmptyTrashDialog
        open={emptyTrashDialogOpen}
        onOpenChange={setEmptyTrashDialogOpen}
        onConfirm={handleEmptyTrash}
        itemCount={items.length}
        isLoading={emptyTrashMutation.isPending}
      />
    </>
  );
}

