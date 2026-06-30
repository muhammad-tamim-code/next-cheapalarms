import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminEstimates,
  useAdminEstimatesTrash,
  useDeleteEstimate,
  useBulkDeleteEstimates,
} from "../react-query/hooks/admin";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { DEFAULT_PAGE_SIZE, DEFAULT_CURRENCY } from "./constants";
import { formatEstimateNumber } from "./format-estimate-number";

/**
 * Filter/table state and data for the admin estimates list page.
 * Keeps URL/query handling (estimateId, shallow replace) and list behaviour in one place.
 */
export function useEstimatesListState() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState(null);
  const [deleteScope, setDeleteScope] = useState("local");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteScope, setBulkDeleteScope] = useState("local");

  const pageSize = DEFAULT_PAGE_SIZE;
  const estimateIdFromQuery = router.query.estimateId;
  const selectedEstimateId = estimateIdFromQuery || null;

  const deleteEstimateMutation = useDeleteEstimate();
  const bulkDeleteMutation = useBulkDeleteEstimates();

  // Fetch up to 100 estimates per request; status tabs filter + paginate client-side.
  const fetchPageSize = 100;
  const { data, isLoading, error, refetch } = useAdminEstimates({
    search: search || undefined,
    workflowStatus: workflowStatusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page: 1,
    pageSize: fetchPageSize,
    enabled: activeTab !== "trash",
  });

  const {
    data: trashData,
    isLoading: trashLoading,
    error: trashError,
    refetch: refetchTrash,
  } = useAdminEstimatesTrash({
    locationId: locationId || undefined,
    limit: 100,
    enabled: activeTab === "trash",
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-estimates"] });
    refetch();
  }, [queryClient, refetch]);

  const filteredEstimates = useMemo(() => {
    const allEstimates = data?.items ?? [];
    if (activeTab === "invoiced") {
      return allEstimates.filter((e) => e.linkedInvoiceId);
    }
    if (activeTab === "sent") {
      return allEstimates.filter((e) => e.portalStatus === "sent" || e.ghlStatus === "sent");
    }
    if (activeTab === "accepted") {
      return allEstimates.filter((e) => e.portalStatus === "accepted");
    }
    if (activeTab === "rejected") {
      return allEstimates.filter((e) => e.portalStatus === "rejected");
    }
    return allEstimates;
  }, [data?.items, activeTab]);

  const estimates = useMemo(() => {
    const offset = (page - 1) * pageSize;
    return filteredEstimates.slice(offset, offset + pageSize);
  }, [filteredEstimates, page, pageSize]);

  const allCount = data?.total ?? filteredEstimates.length;
  const total =
    activeTab === "all" ? allCount : filteredEstimates.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, search, activeTab, workflowStatusFilter]);

  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedIds(new Set(estimates.map((item) => item.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [estimates]
  );

  const handleSelectItem = useCallback((estimateId, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(estimateId);
      } else {
        next.delete(estimateId);
      }
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const estimateIds = Array.from(selectedIds);
    if (estimateIds.length === 0) return;
    try {
      await bulkDeleteMutation.mutateAsync({
        estimateIds,
        locationId: locationId || undefined,
        scope: bulkDeleteScope,
      });
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (err) {
      // Error handled by mutation
    }
  }, [selectedIds, bulkDeleteMutation, locationId, bulkDeleteScope]);

  const handleExportCSV = useCallback(async () => {
    const items = data?.items || [];
    if (items.length === 0) return;
    const mod = await import("xlsx");
    const XLSX = mod.default ?? mod;
    const worksheetData = items.map((est) => ({
      "Estimate Number": formatEstimateNumber(est.estimateNumber, { fallbackId: est.id || "" }) || est.id || "",
      Title: est.title || "ESTIMATE",
      "Customer Name": est.contactName || "",
      Email: est.contactEmail || "",
      Total: est.total || 0,
      Currency: est.currency || DEFAULT_CURRENCY,
      "GHL Status": est.ghlStatus || "",
      "Portal Status": est.portalStatus || "",
      "Workflow Status": est.workflowStatus || "",
      "Created At": est.createdAt ? new Date(est.createdAt) : null,
      "Updated At": est.updatedAt ? new Date(est.updatedAt) : null,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    ws["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Estimates");
    const fileName = `estimates-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [data?.items]);

  const summaryMetrics = useMemo(() => {
    const backendSummary = data?.summary;
    if (backendSummary) {
      return {
        sent: {
          count: backendSummary.sent?.count || 0,
          total: backendSummary.sent?.total || 0,
        },
        accepted: {
          count: backendSummary.accepted?.count || 0,
          total: backendSummary.accepted?.total || 0,
        },
        declined: {
          count: backendSummary.rejected?.count || 0,
          total: backendSummary.rejected?.total || 0,
        },
        invoiced: {
          count: backendSummary.invoiced?.count || 0,
          total: backendSummary.invoiced?.total || 0,
        },
      };
    }
    const sent = (data?.items ?? []).filter(
      (e) => e.portalStatus === "sent" || e.ghlStatus === "sent"
    );
    const accepted = (data?.items ?? []).filter((e) => e.portalStatus === "accepted");
    const declined = (data?.items ?? []).filter((e) => e.portalStatus === "rejected");
    const invoiced = (data?.items ?? []).filter((e) => e.linkedInvoiceId);
    return {
      sent: {
        count: sent.length,
        total: sent.reduce((sum, e) => sum + (e.total || 0), 0),
      },
      accepted: {
        count: accepted.length,
        total: accepted.reduce((sum, e) => sum + (e.total || 0), 0),
      },
      declined: {
        count: declined.length,
        total: declined.reduce((sum, e) => sum + (e.total || 0), 0),
      },
      invoiced: {
        count: invoiced.length,
        total: invoiced.reduce((sum, e) => sum + (e.total || 0), 0),
      },
    };
  }, [data?.summary, data?.items]);

  const handleRowClick = useCallback(
    (estimateId) => {
      router.replace(
        { pathname: router.pathname, query: { ...router.query, estimateId } },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  const handleCloseModal = useCallback(() => {
    const { estimateId, ...restQuery } = router.query;
    router.replace(
      { pathname: router.pathname, query: restQuery },
      undefined,
      { shallow: true }
    );
  }, [router]);

  const handleInvoiceCreated = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const trashCount = trashData?.count || 0;
  const statusTabs = useMemo(
    () => [
      { value: "all", label: "All" },
      { value: "sent", label: "Sent" },
      { value: "accepted", label: "Accepted" },
      { value: "rejected", label: "Rejected" },
      { value: "invoiced", label: "Invoiced" },
      {
        value: "trash",
        label: "Trash",
        badge: trashCount > 0 ? trashCount : undefined,
      },
    ],
    [trashCount]
  );

  const handleDeleteClick = useCallback(
    (estimateId, locId) => {
      setEstimateToDelete({ id: estimateId, locationId: locId || locationId });
      setDeleteDialogOpen(true);
    },
    [locationId]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!estimateToDelete) return;
    try {
      await deleteEstimateMutation.mutateAsync({
        estimateId: estimateToDelete.id,
        locationId: estimateToDelete.locationId || locationId,
        scope: deleteScope,
      });
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
    } catch (err) {
      // Error handled by mutation
    }
  }, [estimateToDelete, locationId, deleteScope, deleteEstimateMutation]);

  const handleViewDetails = useCallback(
    (estimateId) => {
      handleRowClick(estimateId);
    },
    [handleRowClick]
  );

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

  return {
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    activeTab,
    setActiveTab: handleTabChange,
    workflowStatusFilter,
    setWorkflowStatusFilter,
    page,
    setPage,
    locationId,
    setLocationId,
    pageSize,
    deleteDialogOpen,
    setDeleteDialogOpen,
    estimateToDelete,
    setEstimateToDelete,
    deleteScope,
    setDeleteScope,
    selectedIds,
    setSelectedIds,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    bulkDeleteScope,
    setBulkDeleteScope,
    selectedEstimateId,
    data,
    isLoading,
    error,
    refetch,
    trashData,
    trashLoading,
    trashError,
    refetchTrash,
    estimates,
    total,
    totalPages,
    summaryMetrics,
    statusTabs,
    trashCount,
    allCount,
    handleSearchChange: useCallback((value) => {
      setSearch(value);
      setPage(1);
    }, []),
    handleStartDateChange: useCallback((value) => {
      setStartDate(value);
      setPage(1);
    }, []),
    handleEndDateChange: useCallback((value) => {
      setEndDate(value);
      setPage(1);
    }, []),
    handleWorkflowStatusChange: useCallback((value) => {
      setWorkflowStatusFilter(value);
      setPage(1);
    }, []),
    handleRefresh,
    handleSelectAll,
    handleSelectItem,
    handleBulkDelete,
    handleExportCSV,
    handleRowClick,
    handleCloseModal,
    handleInvoiceCreated,
    handleDeleteClick,
    handleDeleteConfirm,
    handleViewDetails,
    deleteEstimateMutation,
    bulkDeleteMutation,
  };
}
