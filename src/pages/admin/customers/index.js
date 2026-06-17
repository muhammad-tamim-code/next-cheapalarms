import Head from "next/head";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { hasPermission } from "../../../lib/auth/hasPermission";
import { isAuthError, isPermissionError } from "../../../lib/admin/utils/error-handler";
import { useCustomersListState } from "../../../lib/admin/useCustomersListState";
import { Spinner } from "../../../components/ui/spinner";
import { DeleteDialog } from "../../../components/admin/DeleteDialog";
import { BulkDeleteDialog } from "../../../components/admin/BulkDeleteDialog";
import { DeleteByEmailDialog } from "../../../components/admin/DeleteByEmailDialog";
import { FloatingActionBar } from "../../../components/admin/FloatingActionBar";
import { Checkbox } from "../../../components/ui/checkbox";
import { Trash2 } from "lucide-react";

export default function AdminCustomers({
  initialWpUsers,
  initialGhlContacts,
  error,
  debugInfo,
  authContext,
}) {
  const canDestructive = hasPermission(authContext, "data.destructive");
  const {
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
  } = useCustomersListState({ initialWpUsers, initialGhlContacts });

  return (
    <>
      <Head>
        <title>Superadmin • Customers</title>
      </Head>
      <AdminLayout title="Customers" authContext={authContext}>
        {error && (
          <Card className="mb-4 border border-error/30 bg-error-bg text-error">
            <CardHeader>
              <CardTitle>Error loading customers</CardTitle>
              <CardDescription>{error}</CardDescription>
              {debugInfo && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Portal access and GHL contacts.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search name, email…"
                className="w-64"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                {refreshing ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Refreshing…
                  </span>
                ) : (
                  "Refresh"
                )}
              </Button>
              {hasPermission(authContext, "data.destructive") && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteByEmailDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete by Email
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList>
                <TabsTrigger value="ghl">
                  GHL Contacts ({filteredGhlContacts.length})
                </TabsTrigger>
                <TabsTrigger value="wp">
                  WordPress Users ({filteredWpUsers.length})
                </TabsTrigger>
              </TabsList>

              {/* GHL Contacts Tab */}
              <TabsContent value="ghl" className="mt-4">
                <div className="overflow-x-auto rounded-md border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ghlContactsIsError ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-xs text-error"
                            colSpan={5}
                          >
                            Failed to load GHL contacts. {ghlErrMsg}{" "}
                            <button
                              type="button"
                              className="underline"
                              onClick={() => refetchContacts()}
                            >
                              Retry
                            </button>
                          </td>
                        </tr>
                      ) : loadingContacts ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-xs text-muted-foreground"
                            colSpan={5}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Spinner size="sm" />
                              Loading contacts…
                            </span>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {filteredGhlContacts.map((contact) => {
                            const badge = getStatusBadge(contact.status);
                            const name =
                              `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
                              "No name";
                            const canInvite =
                              contact.status === "no_account" ||
                              contact.status === "needs_invite";

                            return (
                              <tr
                                key={contact.id}
                                className="border-t border-border/60"
                              >
                                <td className="px-3 py-2">{name}</td>
                                <td className="px-3 py-2">
                                  {contact.email || "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {contact.phone || "—"}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {canInvite ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleInviteGhlContact(contact.id)
                                        }
                                        disabled={inviting[contact.id]}
                                      >
                                        {inviting[contact.id] ? (
                                          <span className="flex items-center gap-2">
                                            <Spinner size="sm" />
                                            Sending…
                                          </span>
                                        ) : (
                                          "Send Portal Invite"
                                        )}
                                      </Button>
                                    ) : contact.matchedUser?.hasPortal ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled
                                      >
                                        Has Portal Access
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Linked
                                      </span>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Delete contact from GoHighLevel"
                                      onClick={() => {
                                        setGhlContactToDelete(contact);
                                        setDeleteGhlContactDialogOpen(true);
                                      }}
                                      disabled={
                                        deleteGhlContactMutation.isPending &&
                                        ghlContactToDelete?.id === contact.id
                                      }
                                      className="text-error hover:text-error/80 hover:bg-error/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredGhlContacts.length === 0 && (
                            <tr>
                              <td
                                className="px-3 py-6 text-center text-xs text-muted-foreground"
                                colSpan={5}
                              >
                                {q
                                  ? "No contacts match your search."
                                  : "No GHL contacts found."}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* WordPress Users Tab */}
              <TabsContent value="wp" className="mt-4">
                <div className="overflow-x-auto rounded-md border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">
                          <Checkbox
                            checked={
                              filteredWpUsers.length > 0 &&
                              selectedUserIds.size === filteredWpUsers.length
                            }
                            onChange={(e) =>
                              handleSelectAllUsers(e.target.checked)
                            }
                            aria-label="Select all"
                          />
                        </th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Portal</th>
                        <th className="px-3 py-2">GHL Linked</th>
                        <th className="px-3 py-2">Roles</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wpUsersIsError ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-xs text-error"
                            colSpan={7}
                          >
                            Failed to load WordPress users. {wpErrMsg}{" "}
                            <button
                              type="button"
                              className="underline"
                              onClick={() => refetchUsers()}
                            >
                              Retry
                            </button>
                          </td>
                        </tr>
                      ) : loadingUsers ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-xs text-muted-foreground"
                            colSpan={7}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Spinner size="sm" />
                              Loading users…
                            </span>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {filteredWpUsers.map((user) => {
                            const isSelected = selectedUserIds.has(
                              String(user.id)
                            );
                            return (
                              <tr
                                key={user.id}
                                className={`border-t border-border/60 ${isSelected ? "bg-primary/10" : ""}`}
                              >
                                <td className="px-3 py-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={(e) =>
                                      handleSelectUser(
                                        user.id,
                                        e.target.checked
                                      )
                                    }
                                    aria-label={`Select user ${user.id}`}
                                  />
                                </td>
                                <td className="px-3 py-2">{user.name}</td>
                                <td className="px-3 py-2">{user.email}</td>
                                <td className="px-3 py-2">
                                  {user.hasPortal ? (
                                    <Badge variant="default">Active</Badge>
                                  ) : (
                                    <Badge variant="outline">No Access</Badge>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {user.ghlContactId ? (
                                    <Badge variant="secondary">Linked</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      Not linked
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {Array.isArray(user.roles) && user.roles.length > 0
                                    ? user.roles.join(", ")
                                    : "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {canDestructive && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setUserToDelete(user);
                                        setDeleteUserDialogOpen(true);
                                      }}
                                      className="text-error hover:text-error/80 hover:bg-error/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredWpUsers.length === 0 && (
                            <tr>
                              <td
                                className="px-3 py-6 text-center text-xs text-muted-foreground"
                                colSpan={7}
                              >
                                {q
                                  ? "No users match your search."
                                  : "No WordPress users found."}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {activeTab === "wp" && canDestructive && (
          <FloatingActionBar
            selectedCount={selectedUserIds.size}
            onClearSelection={() => setSelectedUserIds(new Set())}
            onDeleteSelected={() => setBulkDeleteDialogOpen(true)}
            isLoading={bulkDeleteUsersMutation.isPending}
          />
        )}

        <BulkDeleteDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          onConfirm={handleBulkDeleteUsers}
          itemCount={selectedUserIds.size}
          isLoading={bulkDeleteUsersMutation.isPending}
          showScopeSelection={true}
          scope={bulkDeleteScope}
          onScopeChange={setBulkDeleteScope}
          itemType="User"
          trashMode={false}
        />

        <DeleteDialog
          open={deleteUserDialogOpen}
          onOpenChange={setDeleteUserDialogOpen}
          onConfirm={handleDeleteUserConfirm}
          title="Delete User/Contact"
          description={
            userToDelete
              ? `Are you sure you want to delete ${userToDelete.name || userToDelete.email}? This action cannot be undone.`
              : ""
          }
          itemName={
            userToDelete
              ? (userToDelete.name || userToDelete.email)
              : ""
          }
          isLoading={deleteUserMutation.isPending}
          showScopeSelection={true}
          scope={deleteScope}
          onScopeChange={setDeleteScope}
        />

        <DeleteDialog
          open={deleteGhlContactDialogOpen}
          onOpenChange={setDeleteGhlContactDialogOpen}
          onConfirm={handleDeleteGhlContactConfirm}
          title="Delete GHL Contact"
          description={
            ghlContactToDelete
              ? `Are you sure you want to delete ${ghlContactToDelete.email || ghlContactToDelete.contactName || "this contact"} from GoHighLevel? This cannot be undone.`
              : ""
          }
          itemName={
            ghlContactToDelete
              ? (ghlContactToDelete.email ||
                  ghlContactToDelete.contactName ||
                  ghlContactToDelete.id)
              : ""
          }
          isLoading={deleteGhlContactMutation.isPending}
          showScopeSelection={false}
        />

        <DeleteByEmailDialog
          open={deleteByEmailDialogOpen}
          onOpenChange={setDeleteByEmailDialogOpen}
          onConfirm={handleDeleteByEmail}
          isLoading={deleteByEmailMutation.isPending}
        />
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const { getWordPressUsers, getGHLContacts } = await import(
    "../../../lib/admin/services/customers-data"
  );

  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }

  try {
    let wpUsers = [];
    let ghlContacts = [];
    const initialLoadErrors = {};

    try {
      wpUsers = await getWordPressUsers(ctx.req);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to fetch WordPress users";
      initialLoadErrors.wpUsers = msg;
    }

    try {
      ghlContacts = await getGHLContacts(ctx.req);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to fetch GHL contacts";
      initialLoadErrors.ghlContacts = msg;
    }

    const hasInitialErrors = Object.keys(initialLoadErrors).length > 0;

    return {
      props: {
        initialWpUsers: wpUsers,
        initialGhlContacts: ghlContacts,
        ...(hasInitialErrors
          ? {
              error:
                "Some customer data failed to load (usually GHL connectivity). Please try Refresh.",
              debugInfo:
                process.env.NODE_ENV === "development"
                  ? initialLoadErrors
                  : null,
            }
          : {}),
        ...(authCheck.props || {}),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (isAuthError(message)) {
      return {
        redirect: {
          destination: "/login?from=/admin/customers",
          permanent: false,
        },
      };
    }

    if (isPermissionError(message)) {
      return {
        props: {
          initialWpUsers: [],
          initialGhlContacts: [],
          error:
            "You don't have permission to view customers. Please contact an administrator.",
          ...(authCheck.props || {}),
        },
      };
    }

    return {
      props: {
        initialWpUsers: [],
        initialGhlContacts: [],
        error: message,
        debugInfo:
          process.env.NODE_ENV === "development"
            ? { error: message }
            : null,
        ...(authCheck.props || {}),
      },
    };
  }
}
