import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../../components/ui/use-toast";
import { useWordPressUsers, useGHLContactsList } from "../react-query/hooks/use-customers";
import { useAdminEstimates, useAdminInvoices } from "../react-query/hooks/admin";
import { useDeleteGhlContact } from "../react-query/hooks/admin";
import {
  enrichContacts,
  buildContactActivityIndex,
  filterCustomersByTab,
  computeCustomerStats,
  tabCounts,
  exportCustomersCsv,
} from "./customers-utils";

const PAGE_SIZE = 20;
const FETCH_LIMIT = 500;

/**
 * State for the admin Customers tab — GHL contacts enriched with WP accounts + estimate/invoice activity.
 */
export function useCustomersListState() {
  const queryClient = useQueryClient();
  const locationId = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || "";

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [inviting, setInviting] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [newContactOpen, setNewContactOpen] = useState(false);

  const deleteGhlContactMutation = useDeleteGhlContact();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [search, activeTab]);

  const {
    data: contactsData,
    isLoading: loadingContacts,
    isError: contactsIsError,
    error: contactsError,
    refetch: refetchContacts,
  } = useGHLContactsList({ search, limit: FETCH_LIMIT, enabled: true });

  const { data: wpUsers = [], isLoading: loadingUsers } = useWordPressUsers({ enabled: true });

  const { data: estimatesData, isLoading: loadingEstimates } = useAdminEstimates({
    page: 1,
    pageSize: FETCH_LIMIT,
    enabled: true,
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useAdminInvoices({
    page: 1,
    pageSize: FETCH_LIMIT,
    enabled: true,
  });

  const loading = loadingContacts || loadingUsers || loadingEstimates || loadingInvoices;
  const errMsg = contactsIsError
    ? contactsError?.message || "Failed to load contacts."
    : null;

  const enrichedCustomers = useMemo(() => {
    const contacts = contactsData?.contacts ?? [];
    const activity = buildContactActivityIndex(
      estimatesData?.items ?? [],
      invoicesData?.items ?? []
    );
    return enrichContacts(contacts, wpUsers, activity, locationId);
  }, [contactsData, wpUsers, estimatesData, invoicesData, locationId]);

  const filteredCustomers = useMemo(
    () => filterCustomersByTab(enrichedCustomers, activeTab),
    [enrichedCustomers, activeTab]
  );

  const stats = useMemo(() => computeCustomerStats(enrichedCustomers), [enrichedCustomers]);
  const counts = useMemo(() => tabCounts(enrichedCustomers), [enrichedCustomers]);

  const total = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageCustomers = useMemo(() => {
    const offset = (page - 1) * PAGE_SIZE;
    return filteredCustomers.slice(offset, offset + PAGE_SIZE);
  }, [filteredCustomers, page]);

  const selectedContact = useMemo(
    () => enrichedCustomers.find((c) => c.id === selectedContactId) ?? null,
    [enrichedCustomers, selectedContactId]
  );

  const handleSearchChange = useCallback((value) => setQ(value), []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchContacts(),
      queryClient.invalidateQueries({ queryKey: ["wp-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-estimates"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }),
    ]);
    toast({ title: "Refreshed", description: "Customer data updated." });
  }, [refetchContacts, queryClient]);

  const handleRowClick = useCallback((contactId) => {
    setSelectedContactId(contactId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedContactId(null);
  }, []);

  const handleExport = useCallback(() => {
    if (!filteredCustomers.length) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }
    exportCustomersCsv(filteredCustomers);
  }, [filteredCustomers]);

  const handleInvite = useCallback(
    async (ghlContactId) => {
      setInviting((prev) => ({ ...prev, [ghlContactId]: true }));
      try {
        const response = await fetch("/api/customers/invite-ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ghlContactId }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Failed to send invite");
        }
        toast({ title: "Invite sent", description: "Portal invite email sent." });
        queryClient.invalidateQueries({ queryKey: ["wp-users"] });
        queryClient.invalidateQueries({ queryKey: ["ghl-contacts"] });
      } catch (err) {
        toast({
          title: "Invite failed",
          description: err?.message || "Failed to send invite",
          variant: "destructive",
        });
      } finally {
        setInviting((prev) => ({ ...prev, [ghlContactId]: false }));
      }
    },
    [queryClient]
  );

  const handleDeleteClick = useCallback((contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!contactToDelete) return;
    try {
      await deleteGhlContactMutation.mutateAsync({
        contactId: contactToDelete.id,
        locationId: contactToDelete.locationId || locationId,
      });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      if (selectedContactId === contactToDelete.id) {
        setSelectedContactId(null);
      }
      await refetchContacts();
    } catch {
      // mutation handles toast
    }
  }, [
    contactToDelete,
    deleteGhlContactMutation,
    locationId,
    refetchContacts,
    selectedContactId,
  ]);

  const handleCreateContact = useCallback(
    async (payload) => {
      const res = await fetch("/api/ghl/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || data.err || "Failed to create contact");
      }
      toast({ title: "Contact created", description: "Added to GoHighLevel." });
      setNewContactOpen(false);
      await refetchContacts();
    },
    [refetchContacts]
  );

  return {
    q,
    setQ,
    handleSearchChange,
    search,
    activeTab,
    setActiveTab,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
    pageCustomers,
    enrichedCustomers,
    filteredCustomers,
    stats,
    counts,
    loading,
    errMsg,
    refetchContacts,
    handleRefresh,
    selectedContact,
    selectedContactId,
    handleRowClick,
    handleClosePanel,
    handleExport,
    inviting,
    handleInvite,
    deleteDialogOpen,
    setDeleteDialogOpen,
    contactToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    deleteGhlContactMutation,
    newContactOpen,
    setNewContactOpen,
    handleCreateContact,
    locationId,
  };
}
