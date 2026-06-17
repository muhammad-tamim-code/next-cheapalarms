import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { useHealthCheck } from "../../lib/react-query/hooks/admin/use-health-check";
import { RefreshCw, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { useCallback, useMemo } from "react";

/**
 * Health Status Card Component
 * Displays real-time system health status from WordPress API
 */
export function HealthStatusCard({ showRefreshButton = true, autoRefresh = false }) {
  const { data, isLoading, error, refetch, isRefetching } = useHealthCheck({
    enabled: true,
    refetchInterval: autoRefresh ? 30000 : false, // Default to false (no auto-refresh)
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "ok":
      case "healthy":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "skipped":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "error":
      case "unhealthy":
        return <XCircle className="h-4 w-4 text-error" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ok":
      case "healthy":
        return "text-success";
      case "skipped":
        return "text-muted-foreground";
      case "degraded":
        return "text-warning";
      case "error":
      case "unhealthy":
        return "text-error";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "ok":
      case "healthy":
        return "OK";
      case "skipped":
        return "Skipped";
      case "degraded":
        return "Degraded";
      case "error":
      case "unhealthy":
        return "Error";
      default:
        return "Unknown";
    }
  };

  // Format timestamp safely
  const formattedTimestamp = useMemo(() => {
    if (!data?.timestamp) return null;
    try {
      const date = new Date(data.timestamp);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleString();
    } catch {
      return null;
    }
  }, [data?.timestamp]);

  // Format check key for display (replace all underscores)
  const formatCheckKey = useCallback((key) => {
    return key.replace(/_/g, " ");
  }, []);

  // Get overall status for accessibility
  const overallStatusText = useMemo(() => {
    if (!data) return "Loading";
    return `System health status: ${getStatusText(data.status)}`;
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>System Health</CardTitle>
          <CardDescription>
            {data?.cached ? "Cached result" : "Real-time status"}
          </CardDescription>
        </div>
        {showRefreshButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching || isLoading}
            aria-label="Refresh health status"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && !data ? (
          <div 
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-label="Loading health status"
          >
            <Spinner size="sm" aria-hidden="true" />
            <span>Loading health status...</span>
          </div>
        ) : error ? (
          <div 
            className="space-y-2 text-sm"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-medium text-error">Failed to load health status</p>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        ) : data ? (
          <div 
            className="space-y-3"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={overallStatusText}
          >
            {/* Overall Status */}
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-background p-2">
              <span className="text-sm font-medium">Overall Status</span>
              <div className="flex items-center gap-2" aria-label={`Overall status: ${getStatusText(data.status)}`}>
                {getStatusIcon(data.status)}
                <span className={`text-sm font-medium ${getStatusColor(data.status)}`}>
                  {getStatusText(data.status)}
                </span>
              </div>
            </div>

            {/* Individual Checks */}
            {data.checks && (
              <div className="space-y-2" role="list" aria-label="Health check details">
                {Object.entries(data.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-background p-2"
                    role="listitem"
                    aria-label={`${formatCheckKey(key)}: ${check.status === "ok" ? "OK" : check.message || check.status}`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <span className="text-sm capitalize">{formatCheckKey(key)}</span>
                    </div>
                    <span className={`text-xs ${getStatusColor(check.status)}`}>
                      {check.status === "ok" ? "OK" : check.message || check.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Timestamp */}
            {formattedTimestamp && (
              <p className="text-xs text-muted-foreground" aria-label={`Last checked: ${formattedTimestamp}`}>
                Last checked: {formattedTimestamp}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No health data available</p>
        )}
      </CardContent>
    </Card>
  );
}

