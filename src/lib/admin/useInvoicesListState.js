import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminInvoices,
  useBulkDeleteInvoices,
  useDeleteInvoice,
} from "../react-query/hooks/admin";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { DEFAULT_PAGE_SIZE, DEFAULT_CURRENCY } from "./constants";

/**
 * Filter/table state and data for the admin invoices list page.
 * Keeps URL/query handling (invoiceId, shallow replace) and list behaviour in one place.
 */
export function useInvoicesListState() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleteScope, setDeleteScope] = useState("local");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteScope, setBulkDeleteScope] = useState("local");

  const pageSize = DEFAULT_PAGE_SIZE;
  const invoiceIdFromQuery = router.query.invoiceId;
  const selectedInvoiceId = invoiceIdFromQuery || null;

  const statusFilter = activeTab === "all" ? "" : activeTab;

  const deleteInvoiceMutation = useDeleteInvoice();
  const bulkDeleteMutation = useBulkDeleteInvoices();

  const { data, isLoading, error, refetch } = useAdminInvoices({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize,
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    refetch();
  }, [queryClient, refetch]);

  const invoices = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, search, activeTab]);

  const handleRowClick = useCallback(
    (invoiceId) => {
      router.replace(
        { pathname: router.pathname, query: { ...router.query, invoiceId } },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  const handleCloseModal = useCallback(() => {
    const { invoiceId, ...restQuery } = router.query;
    router.replace(
      { pathname: router.pathname, query: restQuery },
      undefined,
      { shallow: true }
    );
  }, [router]);

  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedIds(new Set(invoices.map((item) => item.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [invoices]
  );

  const handleSelectItem = useCallback((invoiceId, checked) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(invoiceId);
      } else {
        newSelected.delete(invoiceId);
      }
      return newSelected;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const invoiceIds = Array.from(selectedIds);
    if (invoiceIds.length === 0) return;

    try {
      await bulkDeleteMutation.mutateAsync({
        invoiceIds,
        locationId: locationId || undefined,
        scope: bulkDeleteScope,
      });
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);

      if (selectedInvoiceId && invoiceIds.includes(selectedInvoiceId)) {
        handleCloseModal();
      }

      handleRefresh();
    } catch (err) {
      // Error handled by mutation
    }
  }, [
    selectedIds,
    bulkDeleteMutation,
    locationId,
    bulkDeleteScope,
    selectedInvoiceId,
    handleCloseModal,
    handleRefresh,
  ]);

  const summaryMetrics = useMemo(() => {
    const sent = invoices.filter(
      (i) => (i.portalStatus || i.ghlStatus) === "sent"
    );
    const paid = invoices.filter(
      (i) => (i.portalStatus || i.ghlStatus) === "paid"
    );
    const partiallyPaid = invoices.filter(
      (i) =>
        (i.portalStatus || i.ghlStatus) === "partial" ||
        (i.portalStatus || i.ghlStatus) === "partiallyPaid"
    );
    const overdue = invoices.filter((i) => {
      if (!i.dueDate) return false;
      const status = i.portalStatus || i.ghlStatus;
      return new Date(i.dueDate) < new Date() && status !== "paid";
    });

    return {
      sent: {
        count: sent.length,
        total: sent.reduce((sum, i) => sum + (i.total || 0), 0),
      },
      paid: {
        count: paid.length,
        total: paid.reduce((sum, i) => sum + (i.total || 0), 0),
      },
      partiallyPaid: {
        count: partiallyPaid.length,
        total: partiallyPaid.reduce(
          (sum, i) => sum + (i.amountDue || 0),
          0
        ),
      },
      overdue: {
        count: overdue.length,
        total: overdue.reduce((sum, i) => sum + (i.amountDue || 0), 0),
      },
    };
  }, [invoices]);

  const handleDeleteClick = useCallback(
    (invoiceId, locId) => {
      setInvoiceToDelete({ id: invoiceId, locationId: locId || locationId });
      setDeleteDialogOpen(true);
    },
    [locationId]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoiceMutation.mutateAsync({
        invoiceId: invoiceToDelete.id,
        locationId: invoiceToDelete.locationId || locationId,
        scope: deleteScope,
      });
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);

      if (selectedInvoiceId === invoiceToDelete.id) {
        handleCloseModal();
      }

      handleRefresh();
    } catch (err) {
      // Error handled by mutation
    }
  }, [
    invoiceToDelete,
    locationId,
    deleteScope,
    deleteInvoiceMutation,
    selectedInvoiceId,
    handleCloseModal,
    handleRefresh,
  ]);

  const shortcuts = useMemo(
    () => ({
      Escape: (e) => {
        e.preventDefault();
        if (deleteDialogOpen) {
          setDeleteDialogOpen(false);
        }
      },
    }),
    [deleteDialogOpen]
  );

  useKeyboardShortcuts(shortcuts, true, [deleteDialogOpen]);

  const getStatusBadgeClass = (status) => {
    const classes = {
      draft: "bg-muted text-muted-foreground border-border",
      sent: "bg-info-bg text-info border-info/30",
      paid: "bg-success-bg text-success border-success/30",
      partial: "bg-warning-bg text-warning border-warning/30",
      partiallyPaid: "bg-warning-bg text-warning border-warning/30",
      voided: "bg-error-bg text-error border-error/30",
      accepted: "bg-success-bg text-success border-success/30",
      rejected: "bg-error-bg text-error border-error/30",
    };
    return classes[status] || "bg-muted text-muted-foreground border-border";
  };

  const formatStatusLabel = (status) => {
    if (!status) return "sent";
    if (status === "partial") return "Partially Paid";
    if (status === "partiallyPaid") return "Partially Paid";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const statusTabs = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent" },
    { value: "paid", label: "Paid" },
    { value: "partial", label: "Partially Paid" },
  ];

  return {
    // Query / list
    invoices,
    total,
    totalPages,
    pageSize,
    isLoading,
    error,
    refetch,
    handleRefresh,

    // Filters / pagination
    search,
    setSearch,
    activeTab,
    setActiveTab,
    page,
    setPage,
    locationId,
    setLocationId,
    statusFilter,

    // Selection
    selectedIds,
    setSelectedIds,
    handleSelectAll,
    handleSelectItem,

    // Modals / detail
    selectedInvoiceId,
    handleRowClick,
    handleCloseModal,

    // Delete single
    deleteDialogOpen,
    setDeleteDialogOpen,
    invoiceToDelete,
    setInvoiceToDelete,
    deleteScope,
    setDeleteScope,
    handleDeleteClick,
    handleDeleteConfirm,
    deleteInvoiceMutation,

    // Bulk delete
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    bulkDeleteScope,
    setBulkDeleteScope,
    handleBulkDelete,
    bulkDeleteMutation,

    // Derived / helpers
    summaryMetrics,
    getStatusBadgeClass,
    formatStatusLabel,
    statusTabs,
    DEFAULT_CURRENCY,
  };
}
