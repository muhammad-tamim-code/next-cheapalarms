import Head from "next/head";
import Link from "next/link";
import AdminLayout from "../../../components/admin/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useState, useCallback } from "react";
import { requireAdmin } from "../../../lib/auth/requireAdmin";
import { useXeroStatus, useXeroAuthorize, useXeroDisconnect } from "../../../lib/react-query/hooks/admin";
import { Spinner } from "../../../components/ui/spinner";
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { apiFetch } from "../../../lib/api/apiFetch";

export default function AdminIntegrations({ authContext }) {
  const [testing, setTesting] = useState(false);
  const [ghlResult, setGhlResult] = useState(null);
  const [xeroResult, setXeroResult] = useState(null);

  // Xero integration hooks
  const { data: xeroStatus, isLoading: xeroStatusLoading, refetch: refetchXeroStatus } = useXeroStatus();
  const { refetch: getXeroAuthUrl, error: xeroAuthError } = useXeroAuthorize();
  const disconnectXero = useXeroDisconnect();

  const isXeroConnected = xeroStatus?.ok && xeroStatus?.connected;

  const testConnection = useCallback(async () => {
    try {
      setTesting(true);
      setGhlResult(null);
      const data = await apiFetch("/api/admin/health");
      const ghl = data?.checks?.ghl_api;
      if (ghl?.status === "ok") {
        setGhlResult({ ok: true, message: ghl.message || "GHL connected successfully" });
      } else if (ghl?.status === "degraded") {
        setGhlResult({ ok: false, message: ghl.message || "GHL connection degraded" });
      } else if (ghl) {
        setGhlResult({ ok: false, message: ghl.message || "GHL connection failed" });
      } else {
        setGhlResult({ ok: false, message: data?.err || "Unable to check GHL status" });
      }
    } catch (err) {
      setGhlResult({ ok: false, message: err?.message || "Health check request failed" });
    } finally {
      setTesting(false);
    }
  }, []);

  const handleConnectXero = useCallback(async () => {
    try {
      const result = await getXeroAuthUrl();
      
      // React Query refetch returns { data, error, ... } on success/error
      if (result?.error) {
        // Error from React Query
        const errorMessage = result.error.message || "Failed to connect to Xero";
        setXeroResult({ ok: false, message: errorMessage });
        return;
      }
      
      // Check if we got a valid response
      const response = result?.data;
      if (response?.ok && response?.authUrl) {
        // Redirect to Xero authorization page
        window.location.href = response.authUrl;
      } else {
        // Handle API error response
        const errorCode = response?.code;
        const errorMessage = response?.err || response?.error || 'Failed to get authorization URL';
        
        // Provide more helpful message for configuration errors
        if (errorCode === 'xero_not_configured') {
          setXeroResult({ 
            ok: false, 
            message: 'Xero credentials are not configured. Please configure CA_XERO_CLIENT_ID, CA_XERO_CLIENT_SECRET, and CA_XERO_REDIRECT_URI in your WordPress configuration (secrets.php or environment variables).' 
          });
          return;
        }
        setXeroResult({ ok: false, message: errorMessage });
      }
    } catch (error) {
      console.error('Failed to get Xero auth URL:', error);
      // Check if it's a configuration error
      const errorCode = error?.code;
      const errorMessage = error?.message || "Failed to connect to Xero";
      
      if (errorCode === 'xero_not_configured' || errorMessage.includes('not configured') || errorMessage.includes('xero_not_configured')) {
        setXeroResult({ 
          ok: false, 
          message: 'Xero credentials are not configured. Please configure CA_XERO_CLIENT_ID, CA_XERO_CLIENT_SECRET, and CA_XERO_REDIRECT_URI in your WordPress configuration (secrets.php or environment variables).' 
        });
      } else {
        setXeroResult({ ok: false, message: errorMessage });
      }
    }
  }, [getXeroAuthUrl]);

  const handleDisconnectXero = useCallback(async () => {
    if (!confirm('Are you sure you want to disconnect Xero? This will require re-authorization to sync invoices.')) {
      return;
    }
    try {
      await disconnectXero.mutateAsync();
      setXeroResult({ ok: true, message: "Xero disconnected successfully" });
    } catch (error) {
      setXeroResult({ ok: false, message: error.message || "Failed to disconnect Xero" });
    }
  }, [disconnectXero]);

  return (
    <>
      <Head>
        <title>Superadmin • Integrations</title>
      </Head>
      <AdminLayout title="Integrations" authContext={authContext}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>GoHighLevel</CardTitle>
              <CardDescription>Credentials and connection test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Credentials in WordPress or server config</p>
                  <p className="text-xs text-muted-foreground">
                    Save API key and Location ID under{" "}
                    <Link href="/admin/settings" className="underline underline-offset-2 hover:text-foreground">
                      Settings
                    </Link>
                    , or set them via environment / secrets.php (database wins when both exist).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
                  {testing ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Testing…
                    </>
                  ) : (
                    "Test connection"
                  )}
                </Button>
              </div>
              {ghlResult ? (
                <p className={`text-xs ${ghlResult.ok ? "text-success" : "text-error"}`}>{ghlResult.message}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Xero</CardTitle>
              <CardDescription>Invoice management and accounting integration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {xeroStatusLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {isXeroConnected ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-xs text-success font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Not Connected</span>
                      </>
                    )}
                  </div>
                  
                  {isXeroConnected && xeroStatus?.tenantId && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">Tenant ID</p>
                      <p className="text-xs font-mono text-foreground mt-1">{xeroStatus.tenantId}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {isXeroConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectXero}
                        disabled={disconnectXero.isPending}
                      >
                        {disconnectXero.isPending ? "Disconnecting…" : "Disconnect"}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleConnectXero}
                        disabled={getXeroAuthUrl.isFetching || getXeroAuthUrl.isLoading}
                      >
                        {getXeroAuthUrl.isFetching || getXeroAuthUrl.isLoading ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Connecting…
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3 mr-2" />
                            Connect Xero
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchXeroStatus()}
                      disabled={xeroStatusLoading}
                    >
                      Refresh
                    </Button>
                  </div>

                  {xeroResult ? (
                    <p className={`text-xs ${xeroResult.ok ? "text-success" : "text-error"}`}>{xeroResult.message}</p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authCheck = await requireAdmin(ctx, { notFound: true });
  if (authCheck.notFound || authCheck.redirect) {
    return authCheck;
  }
  return { props: { ...(authCheck.props || {}) } };
}

