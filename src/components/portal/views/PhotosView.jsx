import { Camera, ArrowLeft } from "lucide-react";
import { Button } from "../../ui/button";
import { PhotoUploadView } from "../photo-upload/PhotoUploadView";
import { Spinner } from "../../ui/spinner";

/**
 * Photos section / dedicated route (?section=photos&estimateId=...).
 *
 * Full-width wrapper around PhotoUploadView so the install-photo flow has its
 * own page chrome — matches the customer-portal mockup
 * (see portal-dashboard-mockup.html, "VIEW: PHOTOS").
 */
export function PhotosView({
  estimateId,
  view,
  estimate,
  loading,
  error,
  onBack,
}) {
  if (!estimateId) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
        <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">No estimate selected</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Open an estimate first, then come back to this tab to upload install photos.
        </p>
        {onBack ? (
          <Button onClick={onBack} variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4" />
            Back to estimates
          </Button>
        ) : null}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error-bg p-6 text-error shadow-lg">
        <p className="text-lg font-semibold mb-1">Error loading photos</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {estimate?.label || `Estimate ${estimateId}`}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Install photos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Snap a photo of where each device will go so installers can plan ahead.
          </p>
        </div>
        {onBack ? (
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        ) : null}
      </div>

      <PhotoUploadView
        estimateId={estimateId}
        locationId={view?.locationId}
        view={view}
      />
    </div>
  );
}
