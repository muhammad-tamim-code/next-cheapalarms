import { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../../components/ui/use-toast";
import { matchContactsToUsers, getStatusBadge } from "./services/customers-data";
import { useWordPressUsers, useGHLContacts } from "../react-query/hooks";
import {
  useDeleteUser,
  useDeleteGhlContact,
  useBulkDeleteUsers,
  useDeleteByEmail,
} from "../react-query/hooks/admin";

/**
 * Filter/table state and data for the admin customers list page.
 * Accepts initial data from getServerSideProps to avoid hydration mismatch.
 * @param {{ initialWpUsers?: Array, initialGhlContacts?: Array }} initialData
 */
export function useCustomersListState(initialData = {}) {
  const { initialWpUsers = [], initialGhlContacts = [] } = initialData;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("wp");
  const [q, setQ] = useState("");
  const [inviting, setInviting] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteScope, setDeleteScope] = useState("local");
  const [deleteGhlContactDialogOpen, setDeleteGhlContactDialogOpen] =
    useState(false);
  const [ghlContactToDelete, setGhlContactToDelete] = useState(null);
  const [locationId, setLocationId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteScope, setBulkDeleteScope] = useState("local");
  const [deleteByEmailDialogOpen, setDeleteByEmailDialogOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const deleteUserMutation = useDeleteUser();
  const deleteGhlContactMutation = useDeleteGhlContact();
  const bulkDeleteUsersMutation = useBulkDeleteUsers();
  const deleteByEmailMutation = useDeleteByEmail();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const {
    data: wpUsers = [],
    isLoading: loadingUsers,
    isError: wpUsersIsError,
    error: wpUsersError,
    refetch: refetchUsers,
  } = useWordPressUsers({
    enabled: true,
    initialData: initialWpUsers || [],
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });

  const {
    data: ghlContacts = [],
    isLoading: loadingContacts,
    isError: ghlContactsIsError,
    error: ghlContactsError,
    refetch: refetchContacts,
  } = useGHLContacts({
    limit: 50,
    enabled: true,
    initialData: initialGhlContacts || [],
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });

  const loading = loadingUsers || loadingContacts || refreshing;
  const wpErrMsg = wpUsersIsError
    ? wpUsersError?.message || "Failed to load WordPress users."
    : null;
  const ghlErrMsg = ghlContactsIsError
    ? ghlContactsError?.message || "Failed to load GHL contacts."
    : null;

  const matchedContacts = useMemo(() => {
    const contactsToUse = !isHydrated ? (initialGhlContacts || []) : ghlContacts;
    const usersToUse = !isHydrated ? (initialWpUsers || []) : wpUsers;
    return matchContactsToUsers(contactsToUse, usersToUse);
  }, [ghlContacts, wpUsers, initialGhlContacts, initialWpUsers, isHydrated]);

  const filteredWpUsers = useMemo(() => {
    const usersToUse = !isHydrated ? (initialWpUsers || []) : wpUsers;
    if (!q?.trim()) return usersToUse;
    const s = q.toLowerCase();
    return usersToUse.filter(
      (user) =>
        user.name?.toLowerCase().includes(s) ||
        user.email?.toLowerCase().includes(s) ||
        user.firstName?.toLowerCase().includes(s) ||
        user.lastName?.toLowerCase().includes(s)
    );
  }, [wpUsers, q, initialWpUsers, isHydrated]);

  const filteredGhlContacts = useMemo(() => {
    if (!q?.trim()) return matchedContacts;
    const s = q.toLowerCase();
    return matchedContacts.filter(
      (contact) =>
        (contact.firstName || "").toLowerCase().includes(s) ||
        (contact.lastName || "").toLowerCase().includes(s) ||
        (contact.email || "").toLowerCase().includes(s) ||
        (contact.phone || "").includes(s)
    );
  }, [matchedContacts, q]);

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [activeTab, q]);

  const handleSelectAllUsers = useCallback(
    (checked) => {
      if (checked) {
        setSelectedUserIds(
          new Set(filteredWpUsers.map((user) => String(user.id)))
        );
      } else {
        setSelectedUserIds(new Set());
      }
    },
    [filteredWpUsers]
  );

  const handleSelectUser = useCallback((userId, checked) => {
    setSelectedUserIds((prev) => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(String(userId));
      } else {
        newSelected.delete(String(userId));
      }
      return newSelected;
    });
  }, []);

  const handleBulkDeleteUsers = useCallback(async () => {
    const userIds = Array.from(selectedUserIds).map(Number);
    if (userIds.length === 0) return;

    try {
      await bulkDeleteUsersMutation.mutateAsync({
        userIds,
        locationId: locationId || undefined,
        scope: bulkDeleteScope,
      });
      setSelectedUserIds(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (err) {
      // Error handled by mutation
    }
  }, [
    selectedUserIds,
    bulkDeleteUsersMutation,
    locationId,
    bulkDeleteScope,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUsers(), refetchContacts()]);
      toast({
        title: "Refreshed",
        description: "Customer data has been refreshed.",
      });
    } catch (err) {
      toast({
        title: "Refresh failed",
        description: err?.message || "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [refetchUsers, refetchContacts]);

  const handleDeleteByEmail = useCallback(
    async (email) => {
      try {
        await deleteByEmailMutation.mutateAsync({
          email,
          locationId: locationId || undefined,
        });
        setDeleteByEmailDialogOpen(false);
        await handleRefresh();
      } catch (err) {
        // Error handled by mutation
      }
    },
    [deleteByEmailMutation, locationId, handleRefresh]
  );

  const handleInviteGhlContact = useCallback(
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

        toast({
          title: "Invite sent",
          description: "Portal invite has been sent to the contact.",
        });

        queryClient.invalidateQueries({ queryKey: ["wp-users"] });
        queryClient.invalidateQueries({ queryKey: ["ghl-contacts"] });
        await handleRefresh();
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
    [queryClient, handleRefresh]
  );

  const handleDeleteUserConfirm = useCallback(async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync({
        userId: userToDelete.id,
        locationId: locationId || undefined,
        scope: deleteScope,
      });
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
    } catch (err) {
      // Error handled in mutation
    }
  }, [
    userToDelete,
    locationId,
    deleteScope,
    deleteUserMutation,
  ]);

  const handleDeleteGhlContactConfirm = useCallback(async () => {
    if (!ghlContactToDelete) return;
    try {
      await deleteGhlContactMutation.mutateAsync({
        contactId: ghlContactToDelete.id,
        locationId: ghlContactToDelete.locationId,
      });
      setDeleteGhlContactDialogOpen(false);
      setGhlContactToDelete(null);
      await handleRefresh();
    } catch (err) {
      // Error handled in mutation
    }
  }, [
    ghlContactToDelete,
    deleteGhlContactMutation,
    handleRefresh,
  ]);

  return {
    activeTab,
    setActiveTab,
    q,
    setQ,
    inviting,
    loading,
    refreshing,
    wpErrMsg,
    ghlErrMsg,
    filteredWpUsers,
    filteredGhlContacts,
    selectedUserIds,
    setSelectedUserIds,
    handleSelectAllUsers,
    handleSelectUser,
    handleBulkDeleteUsers,
    handleRefresh,
    handleDeleteByEmail,
    handleInviteGhlContact,
    getStatusBadge,
    deleteUserDialogOpen,
    setDeleteUserDialogOpen,
    userToDelete,
    setUserToDelete,
    deleteScope,
    setDeleteScope,
    handleDeleteUserConfirm,
    deleteUserMutation,
    deleteGhlContactDialogOpen,
    setDeleteGhlContactDialogOpen,
    ghlContactToDelete,
    setGhlContactToDelete,
    handleDeleteGhlContactConfirm,
    deleteGhlContactMutation,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    bulkDeleteScope,
    setBulkDeleteScope,
    bulkDeleteUsersMutation,
    deleteByEmailDialogOpen,
    setDeleteByEmailDialogOpen,
    deleteByEmailMutation,
    refetchUsers,
    refetchContacts,
    loadingUsers,
    loadingContacts,
    wpUsersIsError,
    ghlContactsIsError,
  };
}
