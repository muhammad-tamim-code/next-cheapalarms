import { useRouter } from "next/router";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { usePortalStatus, usePortalDashboard, useEstimate } from "../lib/react-query/hooks";
import { normaliseStatus } from "../components/portal/utils/status-normalizer";
import { formatAddress } from "../components/portal/utils/portal-utils";
import { apiFetch } from "../lib/api/apiFetch";
import { DEFAULT_CURRENCY } from "../lib/admin/constants";

/**
 * Custom hook to manage all portal state and data fetching
 */
export function usePortalState({ initialStatus, initialError, initialEstimateId, initialEstimates }) {
  const router = useRouter();
  
  // Extract estimateId from URL
  const estimateId = useMemo(() => {
    // Only use initialEstimateId before the router is ready (SSR hydration).
    // After router is ready, the URL is the source of truth. This prevents
    // "sticky" estimateId when navigating back to /portal (overview).
    if (!router.isReady) {
      return initialEstimateId || null;
    }

    if (router.query.estimateId) {
      const val = router.query.estimateId;
      return Array.isArray(val) ? val[0] : val;
    }

    // If URL has no estimateId, we are not in estimate detail view.
    return null;
  }, [router.isReady, router.query.estimateId, initialEstimateId]);

  // Extract section from URL
  const sectionFromUrl = useMemo(() => {
    if (router.isReady && router.query.section) {
      const val = router.query.section;
      return Array.isArray(val) ? val[0] : val;
    }
    return null;
  }, [router.isReady, router.query.section]);

  // Derive activeNav from URL - URL is the source of truth
  const activeNav = useMemo(() => {
    if (sectionFromUrl) {
      return sectionFromUrl;
    }
    // If estimateId exists but no section, default to estimates detail view
    if (estimateId) {
      return "estimates";
    }
    // Otherwise default to overview
    return "overview";
  }, [sectionFromUrl, estimateId]);

  const inviteToken = useMemo(() => {
    if (router.isReady && router.query.inviteToken) {
      const val = router.query.inviteToken;
      return Array.isArray(val) ? val[0] : val;
    }
    return null;
  }, [router.isReady, router.query.inviteToken]);

  // Fetch portal status when estimateId exists
  const {
    data: statusData,
    error: statusError,
    isLoading: statusLoading,
  } = usePortalStatus({
    estimateId: estimateId || null,
    inviteToken: inviteToken || null,
    enabled: !!estimateId && router.isReady,
    initialData: initialStatus,
  });

  // Fetch full estimate data for Overview (with items/pricing)
  const {
    data: estimateData,
    error: estimateError,
    isLoading: estimateLoading,
  } = useEstimate({
    estimateId: estimateId || null,
    inviteToken: inviteToken || null,
    // Only fetch full estimate (items/pricing) when user is on the estimate detail view.
    // This avoids heavy GHL-backed calls during initial portal load and on non-detail sections.
    enabled: !!estimateId && router.isReady && activeNav === "estimates",
    initialData: null,
  });

  // Fetch dashboard when no estimateId
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: dashboardLoading,
  } = usePortalDashboard({
    enabled: !estimateId && router.isReady,
    initialData: initialEstimates ? { ok: true, estimates: initialEstimates } : undefined,
  });

  const view = useMemo(() => normaliseStatus(statusData), [statusData]);
  const estimates = useMemo(() => {
    if (estimateId) return [];
    if (dashboardData?.ok && Array.isArray(dashboardData.estimates)) {
      return dashboardData.estimates;
    }
    if (Array.isArray(initialEstimates)) {
      return initialEstimates;
    }
    return [];
  }, [estimateId, dashboardData, initialEstimates]);

  // Local state for overview estimate index (client-side switching, no URL changes)
  const [overviewIndex, setOverviewIndex] = useState(0);

  // Reset overview index when estimates change
   
  useEffect(() => {
    if (estimates.length > 0 && overviewIndex >= estimates.length) {
      setOverviewIndex(0);
    }
  }, [estimates.length, overviewIndex]);

  // Optimized: Only fetch current estimate + prefetch next/prev (not all at once)
  const shouldFetchEstimates = activeNav === 'overview' && !estimateId && estimates.length > 0;
  
  // Determine which estimates to fetch on Overview:
  // Fetch current + prefetch adjacent estimates (prev/next) for instant navigation
  const estimatesToFetch = useMemo(() => {
    if (!shouldFetchEstimates || estimates.length === 0) return [];
    
    const toFetch = [];
    const seen = new Set();
    
    // Always include current
    const current = estimates[overviewIndex];
    if (current) {
      toFetch.push(current);
      seen.add(current.estimateId);
    }
    
    // Prefetch previous (if exists and not already included)
    if (overviewIndex > 0) {
      const prev = estimates[overviewIndex - 1];
      if (prev && !seen.has(prev.estimateId)) {
        toFetch.push(prev);
        seen.add(prev.estimateId);
      }
    }
    
    // Prefetch next (if exists and not already included)
    if (overviewIndex < estimates.length - 1) {
      const next = estimates[overviewIndex + 1];
      if (next && !seen.has(next.estimateId)) {
        toFetch.push(next);
        seen.add(next.estimateId);
      }
    }
    
    return toFetch;
  }, [shouldFetchEstimates, estimates, overviewIndex]);
  
  const estimateDetailsQueries = useQueries({
    queries: estimatesToFetch.map((est) => ({
      queryKey: ['estimate-details', est.estimateId],
      queryFn: async () => {
        // Fetch both status and estimate data in parallel using Next.js API routes
        const params = {
          estimateId: est.estimateId,
          locationId: est.locationId,
          inviteToken: inviteToken || undefined,
        };
        
        const [status, estimate] = await Promise.all([
          apiFetch('/api/portal/status', { params }),
          apiFetch('/api/estimate', { params }).catch(() => null),
        ]);

        // Merge the data (same format as original getEstimateDetails)
        return {
          ...status,
          // Add estimate line items and pricing if available
          items: estimate?.items || [],
          subtotal: estimate?.subtotal || 0,
          taxTotal: estimate?.taxTotal || 0,
          total: estimate?.total || status?.quote?.total || 0,
        };
      },
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    })),
  });

  // Create a map of estimate details by estimateId for quick lookup
  const estimateDetailsMap = useMemo(() => {
    const map = new Map();
    estimatesToFetch.forEach((est, idx) => {
      const query = estimateDetailsQueries[idx];
      if (query?.data) {
        map.set(est.estimateId, query.data);
      }
    });
    return map;
  }, [estimatesToFetch, estimateDetailsQueries]);

  // Combine basic estimate info from dashboard with full details from queries
  const enrichedEstimates = useMemo(() => {
    if (!shouldFetchEstimates) return estimates;
    
    return estimates.map((est) => {
      const details = estimateDetailsMap.get(est.estimateId);
      
      if (!details) {
        // Return basic info while loading
        return est;
      }

      // Merge dashboard data with full details
      return {
        ...est,
        ...details,
        // Keep basic fields from dashboard
        estimateId: est.estimateId,
        locationId: est.locationId,
        portalUrl: est.portalUrl,
        resetUrl: est.resetUrl,
        lastInviteAt: est.lastInviteAt,
      };
    });
  }, [estimates, estimateDetailsMap, shouldFetchEstimates]);

  // Check if we're still loading the current estimate details
  const currentEstimate = estimates[overviewIndex];
  const currentEstimateQuery = currentEstimate 
    ? estimateDetailsQueries.find((_, idx) => estimatesToFetch[idx]?.estimateId === currentEstimate.estimateId)
    : null;
  const isLoadingEstimateDetails = shouldFetchEstimates && 
    currentEstimateQuery?.isLoading;

  const loading = estimateId ? statusLoading : (dashboardLoading || isLoadingEstimateDetails);
  // Check initialError first (from getServerSideProps) - it takes priority over React Query errors
  // This ensures server-side errors (like invalid invite tokens) are displayed
  const error = initialError || (estimateId ? statusError?.message : dashboardError?.message);

  // Get last viewed estimate from localStorage (SSR-safe)
  const [lastViewedEstimateId, setLastViewedEstimateId] = useState(estimateId || null);
  
   
  useEffect(() => {
    if (estimateId) {
      setLastViewedEstimateId(estimateId);
    } else if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("ca_last_estimate");
      if (stored) {
        setLastViewedEstimateId(stored);
      }
    }
  }, [estimateId]);

  // Save estimateId to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined" || !estimateId) return;
    window.localStorage.setItem("ca_last_estimate", String(estimateId));
  }, [estimateId]);

  // Navigation handlers
  const handleSelectEstimate = useCallback(
    (nextEstimateId) => {
      if (!nextEstimateId) return;
      const params = new URLSearchParams();
      params.set("estimateId", nextEstimateId);
      params.set("section", "estimates");
      if (inviteToken) {
        params.set("inviteToken", inviteToken);
      }
      router.push(`/portal?${params.toString()}`);
    },
    [router, inviteToken]
  );

  const handleBackToList = useCallback(() => {
    const params = new URLSearchParams();
    // Explicitly go to estimates list view (no estimateId in URL)
    params.set("section", "estimates");
    if (inviteToken) {
      params.set("inviteToken", inviteToken);
    }
    router.push(`/portal${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, inviteToken]);

  const handleNavigateToSection = useCallback(
    (section) => {
      // "overview" is the default dashboard view - should have clean URL (no estimateId, no section param)
      if (section === "overview") {
        const params = new URLSearchParams();
        // Only preserve inviteToken for guest access
        if (inviteToken) {
          params.set("inviteToken", inviteToken);
        }
        const queryString = params.toString();
        router.push(`/portal${queryString ? `?${queryString}` : ""}`, undefined, { shallow: true });
        return;
      }
      
      // For other sections, preserve estimateId if it exists
      const params = new URLSearchParams();
      if (estimateId) {
        params.set("estimateId", estimateId);
      }
      params.set("section", section);
      if (inviteToken) {
        params.set("inviteToken", inviteToken);
      }
      const queryString = params.toString();
      router.push(`/portal${queryString ? `?${queryString}` : ""}`, undefined, { shallow: true });
    },
    [router, estimateId, inviteToken]
  );

  // Resume estimate (last viewed or first)
  const resumeEstimate = useMemo(() => {
    if (estimates.length === 0) return null;
    if (lastViewedEstimateId) {
      const found = estimates.find(
        (e) => (e?.estimateId ?? e?.id)?.toString() === lastViewedEstimateId.toString()
      );
      if (found) return found;
    }
    return estimates[0];
  }, [estimates, lastViewedEstimateId]);

  const handleUploadImages = useCallback(() => {
    if (!estimateId) {
      if (resumeEstimate) {
        handleSelectEstimate(resumeEstimate.estimateId || resumeEstimate.id);
      }
      return;
    }
    handleNavigateToSection("estimates");
  }, [estimateId, resumeEstimate, handleSelectEstimate, handleNavigateToSection]);

  const handleNavigateToPhotos = useCallback(() => {
    if (!estimateId) return;
    handleNavigateToSection("estimates");
  }, [estimateId, handleNavigateToSection]);

  // Navigate to next/previous estimate (client-side only, no URL changes on overview)
  const handleNextEstimate = useCallback(() => {
    if (enrichedEstimates.length === 0) return;
    
    // On overview page (no estimateId in URL), use local state
    if (!estimateId && activeNav === 'overview') {
      setOverviewIndex((prev) => 
        prev < enrichedEstimates.length - 1 ? prev + 1 : prev
      );
      return;
    }
    
    // On estimates detail view (estimateId in URL), navigate via URL
    const currentIdx = enrichedEstimates.findIndex(
      (e) => (e.estimateId || e.id) === estimateId
    );
    if (currentIdx < enrichedEstimates.length - 1) {
      const nextEstimate = enrichedEstimates[currentIdx + 1];
      handleSelectEstimate(nextEstimate.estimateId || nextEstimate.id);
    }
  }, [enrichedEstimates, estimateId, activeNav, handleSelectEstimate]);

  const handlePrevEstimate = useCallback(() => {
    if (enrichedEstimates.length === 0) return;
    
    // On overview page (no estimateId in URL), use local state
    if (!estimateId && activeNav === 'overview') {
      setOverviewIndex((prev) => prev > 0 ? prev - 1 : prev);
      return;
    }
    
    // On estimates detail view (estimateId in URL), navigate via URL
    const currentIdx = enrichedEstimates.findIndex(
      (e) => (e.estimateId || e.id) === estimateId
    );
    if (currentIdx > 0) {
      const prevEstimate = enrichedEstimates[currentIdx - 1];
      handleSelectEstimate(prevEstimate.estimateId || prevEstimate.id);
    }
  }, [enrichedEstimates, estimateId, activeNav, handleSelectEstimate]);

  // Get current estimate index for display
  const currentEstimateIndex = useMemo(() => {
    if (enrichedEstimates.length === 0) return 0;
    
    // On overview page (no estimateId), use local index
    if (!estimateId && activeNav === 'overview') {
      return overviewIndex;
    }
    
    // On estimates detail view, find index by estimateId
    const idx = enrichedEstimates.findIndex(
      (e) => (e.estimateId || e.id) === estimateId
    );
    return idx === -1 ? 0 : idx;
  }, [enrichedEstimates, estimateId, activeNav, overviewIndex]);

  // Computed values
  const missionSteps = useMemo(() => {
    if (!view) return [];
    const quoteAccepted = view.quote?.status === "accepted";
    const photosUploaded = (view.photos?.items?.length || 0) > 0;
    return [
      { label: "Select Project", caption: "Choose the site you're working on", done: true },
      { label: "Review & Adjust", caption: "Confirm devices + notes", done: true },
      { label: "Upload Photos", caption: "Snap the highlighted areas", done: photosUploaded },
      { label: "Approve & Pay", caption: "Unlock once pricing updated", done: quoteAccepted },
      { label: "Install Day", caption: "Crew waits for your approval", done: false },
    ];
  }, [view]);

  const photoItems = useMemo(() => {
    const items = estimateData?.ok ? estimateData.items || [] : [];
    
    if (items.length === 0) return [];
    
    const uploadedPhotos = view?.photos?.items || [];
    const photoCountsByItem = {};
    uploadedPhotos.forEach((photo) => {
      const itemName = photo.itemName || "Unknown";
      photoCountsByItem[itemName] = (photoCountsByItem[itemName] || 0) + 1;
    });
    
    const grouped = {};
    items.forEach((item) => {
      const itemName = item.name || "Unknown Item";
      const qty = item.qty || item.quantity || 1;
      if (!grouped[itemName]) {
        const uploadedCount = photoCountsByItem[itemName] || 0;
        grouped[itemName] = {
          label: itemName,
          quantity: 0,
          status: uploadedCount > 0 ? "Uploaded" : "Pending",
          uploadedCount: uploadedCount,
        };
      }
      grouped[itemName].quantity += qty;
    });
    
    return Object.values(grouped);
  }, [estimateData, view]);

  const activityFeed = useMemo(() => {
    const entries = [];
    
    // Add revision history entries (estimate edits by admin)
    if (view?.revisionHistory && Array.isArray(view.revisionHistory)) {
      const sortedRevisions = [...view.revisionHistory].sort((a, b) => 
        new Date(b.revisedAt || 0) - new Date(a.revisedAt || 0)
      );
      
      sortedRevisions.forEach((rev) => {
        const netChange = rev.netChange || 0;
        const lineChanges = rev.lineChanges || [];
        const addedCount = lineChanges.filter(c => c.action === 'add').length;
        const removedCount = lineChanges.filter(c => c.action === 'remove').length;
        const changedCount = lineChanges.filter(c => c.action === 'qty').length;
        
        // Build description
        let description = '';
        if (netChange < 0) {
          description = `You saved $${Math.abs(netChange).toFixed(2)}`;
        } else if (netChange > 0) {
          description = `Total increased by $${netChange.toFixed(2)}`;
        }
        
        // Add change details
        const changeParts = [];
        if (addedCount > 0) changeParts.push(`${addedCount} item${addedCount > 1 ? 's' : ''} added`);
        if (removedCount > 0) changeParts.push(`${removedCount} item${removedCount > 1 ? 's' : ''} removed`);
        if (changedCount > 0) changeParts.push(`${changedCount} qty change${changedCount > 1 ? 's' : ''}`);
        
        if (changeParts.length > 0) {
          description = description ? `${description} • ${changeParts.join(', ')}` : changeParts.join(', ');
        }
        
        // Add admin note if present
        if (rev.adminNote) {
          description = description ? `${description} — "${rev.adminNote}"` : `"${rev.adminNote}"`;
        }
        
        entries.push({
          label: netChange < 0 ? 'Price Adjusted - Savings!' : 'Estimate Updated',
          detail: description || 'Your estimate has been reviewed',
          time: rev.revisedAt || '',
          rawTime: rev.revisedAt || null,
          type: 'revision',
          revisionId: rev.revisionId,
        });
      });
    }
    
    // Add any existing activity entries
    if (view?.activity && Array.isArray(view.activity)) {
      entries.push(...view.activity);
    }
    
    // Return top 5 most recent
    return entries.slice(0, 5);
  }, [view]);

  const activeEstimate = useMemo(() => {
    if (!estimateId || !view) return null;
    const hasPhotos = (view.photos?.items?.length || 0) > 0;
    // Use portal status (sent/accepted/rejected) - portal is source of truth
    const quoteStatus = view.quote?.status || "sent";
    const statusDisplay = view.quote?.statusLabel || 
      (quoteStatus === "accepted" ? "Accepted" : 
       quoteStatus === "rejected" ? "Rejected" : 
       "Sent");
    return {
      id: estimateId,
      label: view.quote?.number || `Estimate #${estimateId}`,
      status: statusDisplay, // Display label for UI
      statusValue: quoteStatus, // Actual status value for logic
      progress: quoteStatus === "accepted" ? 82 : hasPhotos ? 56 : 32,
      total: estimateData?.ok ? estimateData.total : view.quote?.total || null,
      hasPhotos,
      meta: {
        address: formatAddress(view.installation?.address) || "Site address pending",
        package: view.quote?.packageName || "Base package",
        customer: view.account?.email || "Customer",
      },
    };
  }, [estimateId, view, estimateData]);

  const overviewEstimate = useMemo(() => {
    // When no estimateId in URL (overview page), use enrichedEstimates with local index
    if (!estimateId) {
      if (enrichedEstimates.length === 0) return null;
      
      // Get current estimate from enriched array
      const current = enrichedEstimates[overviewIndex];
      if (!current) return null;
      
      // If full details are loaded, use them
      if (current.quote) {
        return {
          estimateId: current.estimateId,
          number: current.quote?.number || current.number,
          statusLabel: current.quote?.statusLabel || current.statusLabel || "Sent",
          status: current.quote?.status || current.status || "sent",
          statusValue: current.quote?.status || current.status || "sent",
          address: formatAddress(current.installation?.address) || "Site address pending",
          photosCount: current.photos?.items?.length || 0,
          items: current.items || [],
          subtotal: current.subtotal || 0,
          taxTotal: current.taxTotal || 0,
          total: current.total || current.quote?.total || 0,
          label: `Estimate #${current.quote?.number || current.number || current.estimateId}`,
          revision: current.revision || null, // Include revision data
          currency: current.currency || DEFAULT_CURRENCY,
        };
      }
      
      // Fallback to basic info while loading
      return {
        estimateId: current.estimateId,
        number: current.number,
        statusLabel: current.statusLabel || "Sent",
        status: current.status || "sent",
        statusValue: current.status || "sent",
        address: "Loading...",
        photosCount: 0,
        items: [],
        subtotal: 0,
        taxTotal: 0,
        total: 0,
        label: `Estimate #${current.number || current.estimateId}`,
      };
    }
    
    // If estimateId exists in URL, build from view (status) + estimateData
    if (!view) {
      return null;
    }
    
    // Build from view (portal status) - this is always available if estimateId exists
    const baseEstimate = {
      estimateId: estimateId,
      number: view?.quote?.number || estimateId,
      statusLabel: view?.quote?.statusLabel || view?.quote?.status || "Sent",
      status: view?.quote?.status || "sent", // Use portal status (sent/accepted/rejected), not GHL status
      statusValue: view?.quote?.status || "sent",
      address: formatAddress(view?.installation?.address) || "Site address pending",
      photosCount: view?.photos?.items?.length || 0,
      items: estimateData?.ok ? (estimateData.items || []) : [],
      subtotal: estimateData?.ok ? (estimateData.subtotal || 0) : 0,
      taxTotal: estimateData?.ok ? (estimateData.taxTotal || 0) : 0,
      total: estimateData?.ok ? (estimateData.total || 0) : (view?.quote?.total || 0),
      label: estimateData?.ok 
        ? (estimateData.title || `Estimate #${estimateData.estimateNumber || estimateId}`)
        : `Estimate #${view?.quote?.number || estimateId}`,
      revision: view?.revision || null, // Include revision data for RevisionBanner
      revisionHistory: view?.revisionHistory || [], // Full revision history for edit timeline
      currency: estimateData?.ok ? (estimateData.currency || DEFAULT_CURRENCY) : DEFAULT_CURRENCY,
    };
    
    return baseEstimate;
  }, [estimateId, estimateData, enrichedEstimates, overviewIndex, view]);

  // Handler to view full estimate details (must be after overviewEstimate is defined)
  const handleViewDetails = useCallback(() => {
    if (!estimateId) {
      // On overview page without estimateId in URL, select the current estimate first
      const currentEstimate = overviewEstimate || resumeEstimate;
      if (currentEstimate) {
        handleSelectEstimate(currentEstimate.estimateId || currentEstimate.id);
      }
      return;
    }
    handleNavigateToSection("estimates");
  }, [estimateId, overviewEstimate, resumeEstimate, handleSelectEstimate, handleNavigateToSection]);

  const progress = useMemo(() => {
    if (!view) return 0;
    let p = 0;
    if (view.quote?.status === "accepted") p = 82;
    else if (view.photos?.items?.length > 0) p = 56;
    else if (view.quote) p = 32;
    return p;
  }, [view]);

  return {
    // Router state
    estimateId,
    inviteToken,
    activeNav,
    
    // Data
    view,
    estimates,
    estimateData,
    
    // Loading/Error states
    loading,
    error,
    estimateLoading,
    estimateError,
    
    // Navigation handlers
    handleSelectEstimate,
    handleBackToList,
    handleNavigateToSection,
    handleUploadImages,
    handleViewDetails,
    handleNavigateToPhotos,
    handleNextEstimate,
    handlePrevEstimate,
    
    // Computed values
    currentEstimateIndex,
    resumeEstimate,
    missionSteps,
    photoItems,
    activityFeed,
    activeEstimate,
    overviewEstimate,
    progress,
  };
}

