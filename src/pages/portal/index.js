import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import { cookieHeader } from "../../components/portal/utils/portal-utils";
import { PortalSidebar } from "../../components/portal/layout/PortalSidebar";
import { PortalBottomNav } from "../../components/portal/layout/PortalBottomNav";
import { PortalMobileHeader } from "../../components/portal/layout/PortalMobileHeader";
import { PortalMobileMenu } from "../../components/portal/layout/PortalMobileMenu";
import { OverviewView } from "../../components/portal/views/OverviewView";
import { EstimatesListView } from "../../components/portal/views/EstimatesListView";
import { EstimateDetailView } from "../../components/portal/views/EstimateDetailView";
import { PhotosView } from "../../components/portal/views/PhotosView";
import { PaymentsView } from "../../components/portal/views/PaymentsView";
import { SupportView } from "../../components/portal/views/SupportView";
import { PreferencesView } from "../../components/portal/views/PreferencesView";
import { GuestAccessBanner } from "../../components/portal/GuestAccessBanner";
import { Spinner } from "../../components/ui/spinner";
import { WorkflowProgressSkeleton, CardSkeleton } from "../../components/ui/skeleton";
import { getAuthContext } from "../../lib/auth/getAuthContext";
import { getLoginRedirect } from "../../lib/auth";
import { usePortalState } from "../../hooks/usePortalState";
import { ExpiredInviteMessage } from "../../components/portal/ExpiredInviteMessage";
import { PortalErrorBoundary } from "../../components/portal/PortalErrorBoundary";
import { Button } from "../../components/ui/button";
import { BRAND } from "../../config/brand";

export default function PortalPage({ initialStatus, initialError, initialEstimateId, initialEstimates }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const {
    estimateId,
    inviteToken,
    activeNav,
    view,
    overviewView,
    overviewEstimateId,
    estimates,
    estimateData,
    loading,
    error,
    estimateLoading,
    estimateError,
    handleSelectEstimate,
    handleBackToList,
    handleNavigateToSection,
    handleUploadImages,
    handleViewDetails,
    handleNavigateToPhotos,
    handleNextEstimate,
    handlePrevEstimate,
    handleSelectOverviewQuote,
    currentEstimateIndex,
    resumeEstimate,
    missionSteps,
    photoItems,
    photoBadgeCount,
    activityFeed,
    activeEstimate,
    overviewEstimate,
    progress,
  } = usePortalState({ initialStatus, initialError, initialEstimateId, initialEstimates });

  return (
    <>
      <Head>
        <title>Customer Portal • {BRAND.name}</title>
      </Head>
      <main className="light h-screen w-full bg-background text-foreground overflow-hidden">
        {/* Force light theme - portals don't support theme switching */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.05),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(0,0,0,0.04),transparent_50%)]" />
        </div>
        <div className="flex h-full w-full md:gap-6">
          <div className="hidden shrink-0 md:block">
            <PortalSidebar
              activeNav={activeNav}
              onNavChange={handleNavigateToSection}
              estimateId={estimateId}
              onBackToList={handleBackToList}
              support={(overviewView ?? view)?.support}
              badges={{ photos: photoBadgeCount }}
              onPhotosClick={handleNavigateToPhotos}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <PortalMobileHeader
              onMenuClick={() => setMobileMenuOpen(true)}
              onPreferencesClick={() => handleNavigateToSection("preferences")}
            />
            <PortalMobileMenu
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
              activeNav={activeNav}
              onNavChange={handleNavigateToSection}
              onPhotosClick={handleNavigateToPhotos}
              badges={{ photos: photoBadgeCount }}
            />

            <section className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-10">
            <PortalErrorBoundary>
            {/* Guest Access Banner */}
            {((overviewView ?? view)?.isGuestMode) && (
              <GuestAccessBanner 
                daysRemaining={(overviewView ?? view)?.daysRemaining ?? null}
                estimateId={overviewEstimateId ?? estimateId}
                onCreateAccount={() => {
                  // Will be implemented with CreateAccountModal
                  router.push(`/set-password?estimateId=${estimateId}`);
                }}
                onSignIn={() => {
                  router.push(`/login?from=${encodeURIComponent(`/portal?estimateId=${estimateId}`)}`);
                }}
              />
            )}

            {/* Overview View */}
            {activeNav === "overview" && (
              <>
                {loading || estimateLoading ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <WorkflowProgressSkeleton />
                    <CardSkeleton />
                  </div>
                ) : error || estimateError?.message ? (
                  // Check if error is about expired invite token
                  (error?.includes?.('invalid_invite') || 
                   error?.includes?.('expired') || 
                   error?.includes?.('no longer valid') ||
                   estimateError?.message?.includes?.('invalid_invite') ||
                   estimateError?.message?.includes?.('expired') ||
                   estimateError?.message?.includes?.('no longer valid')) ? (
                    <ExpiredInviteMessage estimateId={estimateId} />
                  ) : (
                    <div className="rounded-[32px] border border-error/30 bg-error-bg p-6 text-error shadow-[0_25px_80px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-error-bg p-2">
                          <span className="text-error text-xl">⚠</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold mb-1">Error loading estimate</p>
                          <p className="text-sm text-error mb-4">{error || estimateError?.message}</p>
                          <Button
                            onClick={() => router.reload()}
                            variant="default"
                            className="bg-error text-error-foreground hover:bg-error/90"
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <OverviewView
                    estimate={overviewEstimate}
                    estimates={estimates}
                    currentEstimateIndex={currentEstimateIndex}
                    onSelectQuote={handleSelectOverviewQuote}
                    onUploadImages={handleUploadImages}
                    onNavigateToPhotos={handleNavigateToPhotos}
                    onViewDetails={handleViewDetails}
                    onViewAll={!estimateId && estimates.length > 1 ? () => handleNavigateToSection("estimates") : undefined}
                    view={overviewView ?? view}
                    estimateId={overviewEstimateId ?? estimateId}
                    pendingPhotoCount={photoBadgeCount ?? (overviewView ?? view)?.photos?.missingCount ?? 0}
                  />
                )}
              </>
            )}

            {/* Estimates View */}
            {activeNav === "estimates" && (
              <>
                {!estimateId ? (
                  <EstimatesListView
                    estimates={estimates}
                    loading={loading}
                    error={error}
                    onSelectEstimate={handleSelectEstimate}
                    resumeEstimate={resumeEstimate}
                  />
                ) : loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : error ? (
                  // Check if error is about expired invite token
                  (error?.includes?.('invalid_invite') || 
                   error?.includes?.('expired') || 
                   error?.includes?.('no longer valid')) ? (
                    <ExpiredInviteMessage estimateId={estimateId} />
                  ) : (
                    <div className="rounded-[32px] border border-error/30 bg-error-bg p-6 text-error shadow-[0_25px_80px_rgba(15,23,42,0.08)] animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-error-bg p-2">
                          <span className="text-error text-xl">⚠</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold mb-1">Error loading estimate</p>
                          <p className="text-sm text-error mb-4">{error}</p>
                          <Button
                            onClick={() => router.reload()}
                            variant="default"
                            className="bg-error text-error-foreground hover:bg-error/90"
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                ) : activeEstimate ? (
                  <EstimateDetailView
                    estimate={activeEstimate}
                    progress={progress}
                    view={view}
                    photoItems={photoItems}
                    missionSteps={missionSteps}
                    activityFeed={activityFeed}
                    estimates={estimates}
                    estimateId={estimateId}
                    estimateData={estimateData}
                    onBackToList={handleBackToList}
                    onSelectEstimate={handleSelectEstimate}
                    onNavigateToPhotos={handleNavigateToPhotos}
                  />
                ) : (
                  <div className="rounded-[32px] border border-border bg-surface p-8 text-center shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
                    <h2 className="text-2xl font-semibold text-foreground">Estimate unavailable</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      We couldn&apos;t load that estimate. Refresh the page or request a new invite link from your concierge.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      (If you see this often, check that you’re logged in or that the invite token is still valid.)
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Photos View - dedicated route for the install-photo workflow */}
            {activeNav === "photos" && (
              <PhotosView
                estimateId={estimateId}
                view={view}
                estimate={activeEstimate}
                loading={loading || estimateLoading}
                error={error || estimateError?.message}
                onBack={handleBackToList}
              />
            )}

            {/* Payments View */}
            {activeNav === "payments" && <PaymentsView view={view} />}

            {/* Support View */}
            {activeNav === "support" && <SupportView view={view} />}

            {/* Preferences View */}
            {activeNav === "preferences" && <PreferencesView view={view} />}
            </PortalErrorBoundary>
          </section>

            <PortalBottomNav
              activeNav={activeNav}
              badges={{ photos: photoBadgeCount }}
              onNavChange={handleNavigateToSection}
              onPhotosClick={handleNavigateToPhotos}
            />
          </div>
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps({ query, req }) {
  // Import wpFetch here (server-side only) to prevent client bundling
  // Use dynamic import for ES modules
  const { wpFetch } = await import("../../lib/wp.server");
  
  const estimateId = Array.isArray(query.estimateId) ? query.estimateId[0] : query.estimateId;
  const inviteToken = Array.isArray(query.inviteToken) ? query.inviteToken[0] : query.inviteToken;

  const authContext = await getAuthContext(req);

  // If no estimateId (dashboard view), require authentication
  if (!estimateId) {
    if (!authContext) {
      // Redirect to login if not authenticated
      return {
        redirect: {
          destination: getLoginRedirect("/portal"),
          permanent: false,
        },
      };
    }

    // User is authenticated, fetch dashboard
    try {
      const dashboard = await wpFetch('/ca/v1/portal/dashboard', {
        headers: cookieHeader(req),
      });
      if (dashboard.ok && Array.isArray(dashboard.estimates)) {
        return {
          props: {
            initialStatus: null,
            initialError: null,
            initialEstimateId: null,
            initialEstimates: dashboard.estimates,
          },
        };
      }
      return {
        props: {
          initialStatus: null,
          initialError: null,
          initialEstimateId: null,
          initialEstimates: [],
        },
      };
    } catch (error) {
      // Check if it's an authentication error
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (errorMsg.includes("401") || errorMsg.includes("Authentication")) {
        return {
          redirect: {
            destination: getLoginRedirect("/portal"),
            permanent: false,
          },
        };
      }
      return {
        props: {
          initialStatus: null,
          initialError: null,
          initialEstimateId: null,
          initialEstimates: null,
        },
      };
    }
  }

  // If estimateId exists, allow access with either auth OR inviteToken
  // If neither is present, redirect to login
  if (!authContext && !inviteToken) {
    return {
      redirect: {
        destination: getLoginRedirect(`/portal?estimateId=${estimateId}`),
        permanent: false,
      },
    };
  }

  try {
    const params = new URLSearchParams();
    params.set('estimateId', estimateId);
    if (inviteToken) params.set('inviteToken', inviteToken);
    
    const status = await wpFetch(`/ca/v1/portal/status?${params.toString()}`, {
      headers: cookieHeader(req),
    });
    return {
      props: {
        initialStatus: status,
        initialError: null,
        initialEstimateId: estimateId,
        initialEstimates: null,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    // Extract error details from wpFetch error format: "WP error 403 Forbidden: {...}"
    let errorData = null;
    let statusCode = null;
    try {
      // wpFetch throws: "WP error ${status} ${statusText}: ${errorText}"
      const statusMatch = errorMsg.match(/WP error (\d+)/);
      if (statusMatch) {
        statusCode = parseInt(statusMatch[1], 10);
      }
      
      // Try to parse JSON from error message (wpFetch includes response body)
      const jsonMatch = errorMsg.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        errorData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Parsing failed, use defaults
    }
    
    // Check for invalid/expired invite token (403) - show error, don't redirect
    if (statusCode === 403 && inviteToken) {
      const displayError = errorData?.err || errorData?.error || 
        "This invite link is invalid or has expired. Please use the link from your email.";
      
      return {
        props: {
          initialStatus: null,
          initialError: displayError,
          initialEstimateId: estimateId,
          initialEstimates: null,
        },
      };
    }
    
    // Only redirect for actual authentication errors (401 without inviteToken)
    if (statusCode === 401 && !inviteToken) {
      return {
        redirect: {
          destination: getLoginRedirect(`/portal?estimateId=${estimateId}`),
          permanent: false,
        },
      };
    }
    
    // Other errors - show error message
    const displayError = errorData?.err || errorData?.error || errorMsg;
    return {
      props: {
        initialStatus: null,
        initialError: displayError,
        initialEstimateId: estimateId,
        initialEstimates: null,
      },
    };
  }
}
