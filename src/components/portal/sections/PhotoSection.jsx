/* eslint-disable @next/next/no-img-element */
import { memo, useState, useCallback } from "react";
import { Button } from "../../ui/button";
import { apiFetch } from "../../../lib/api/apiFetch";
import { Input } from "../../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { ProductPhotoUpload } from "./ProductPhotoUpload";
import { useEstimatePhotos } from "../../../lib/react-query/hooks";
import { Spinner } from "../../ui/spinner";

function EmptyPhotoState({ onSelectFiles, onSkip }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We haven't received any photos yet. Upload a few shots of the main areas our technicians will work
        in so we can prepare the correct gear.
      </p>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 rounded-lg border-2 border-dashed border-border bg-muted/40 p-6 text-center">
          <p className="font-medium text-foreground">Drop files here</p>
          <p className="text-sm text-muted-foreground">JPG or PNG up to 10MB each.</p>
          <Button className="mt-4" variant="secondary" onClick={onSelectFiles}>
            Select files
          </Button>
        </div>
        <div className="flex-1 rounded-lg border border-border bg-background p-6">
          <p className="font-medium text-foreground">Can't share photos?</p>
          <p className="text-sm text-muted-foreground">
            Choose "Skip for now" and we'll call to double-check anything we need before installation.
          </p>
          <Button variant="outline" className="mt-4" onClick={onSkip}>
            Skip photos for now
          </Button>
        </div>
      </div>
    </div>
  );
}

export const PhotoSection = memo(function PhotoSection({ photos, photoTab, setPhotoTab, estimateId, locationId, isGuestMode = false }) {
  // Use React Query hook for photos (with caching and automatic refetching)
  const { data: photosData, isLoading: loadingPhotos } = useEstimatePhotos({
    estimateId: estimateId || undefined,
    enabled: !!estimateId,
  });

  // Transform stored uploads to match the expected format
  const uploaded = photosData?.ok && photosData?.stored?.uploads && Array.isArray(photosData.stored.uploads)
    ? photosData.stored.uploads.map((upload) => ({
        url: upload.url || upload.urls?.[0] || "",
        label: upload.label || upload.filename || "Uploaded photo",
        notes: upload.notes || "",
        attachmentId: upload.attachmentId,
        itemName: upload.itemName,
        slotIndex: upload.slotIndex,
        photoIndex: upload.photoIndex,
      }))
    : photos.items ?? [];

  const samples = photos.samples ?? [];
  const missing = photos.missingCount ?? 0;
  const required = photos.required ?? 6;
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [photosSkipped, setPhotosSkipped] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  // Track whether we should auto-trigger the file picker on the "missing" tab
  const [autoTriggerUpload, setAutoTriggerUpload] = useState(false);

  // Update tabs when uploaded count changes
  const tabs = [
    { id: "uploaded", label: `Uploaded (${uploaded.length})` },
    { id: "missing", label: `Missing (${missing})` },
    { id: "samples", label: "Example shots" },
  ];

  // Handle skip photos
  const handleSkipPhotosClick = useCallback(() => {
    setSkipDialogOpen(true);
  }, []);

  const handleSkipPhotosConfirm = useCallback(() => {
    setPhotosSkipped(true);
    setSkipDialogOpen(false);
    // Optionally, you could store this in the backend
    // For now, just show a confirmation message
  }, []);

  const handleSendPasswordReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setEmailError("Please enter your email address");
      return;
    }
    setEmailError("");
    setSendingEmail(true);
    try {
      const json = await apiFetch("/api/auth/send-password-reset", {
        method: "POST",
        body: { email },
      });
      if (!json.ok) {
        throw new Error(json.err || json.error || "Failed to send email");
      }
      setEmailSent(true);
      setEmail("");
    } catch (err) {
      setEmailError(err.message || "Failed to send password reset email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle photo upload completion (React Query mutation handles storage and cache invalidation)
  const handleUploadComplete = useCallback(
    () => {
      // React Query mutation automatically invalidates and refetches photos
      // No need to manually update state or fetch
      setUploadError("");
    },
    []
  );

  const handleUploadError = useCallback((error) => {
    setUploadError(error);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Site photos</CardTitle>
          <CardDescription>
            Uploading photos helps the install team prepare the right equipment.
          </CardDescription>
        </div>
        <div className="flex gap-2 rounded-md border border-border bg-muted/40 p-1 text-xs">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              onClick={() => setPhotoTab(tab.id)}
              variant={photoTab === tab.id ? "default" : "ghost"}
              size="sm"
              className="rounded"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {/* Email input for password reset */}
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="mb-2 font-medium text-foreground">Need to log in?</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Enter your email address and we'll send you a link to set your password.
          </p>
          {emailSent ? (
            <div className="rounded-md bg-success-bg p-3 text-sm text-success">
                Password reset email sent! Check your inbox.
              </div>
          ) : (
            <form onSubmit={handleSendPasswordReset} className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1"
                disabled={sendingEmail}
              />
              <Button type="submit" disabled={sendingEmail || !email} variant="secondary" className="sm:w-auto">
                {sendingEmail ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Sending...
                  </span>
                ) : (
                  "Send Login Link"
                )}
              </Button>
            </form>
          )}
          {emailError && (
            <p className="mt-2 text-xs text-error">{emailError}</p>
          )}
        </div>
        {photoTab === "uploaded" ? (
          uploaded.length ? (
            <ul className="grid gap-4 md:grid-cols-3">
              {uploaded.map((photo) => (
                <li key={photo.url} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="overflow-hidden rounded-md bg-muted">
                    <img
                      src={photo.url}
                      alt={photo.label ?? "Uploaded photo"}
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">{photo.label ?? "Uploaded photo"}</div>
                    {photo.notes ? <p>{photo.notes}</p> : null}
                    <p>{photo.size ?? "JPEG"}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyPhotoState
              onSelectFiles={() => {
                // Switch to missing tab and signal ProductPhotoUpload to auto-open file picker
                setAutoTriggerUpload(true);
                setPhotoTab("missing");
              }}
              onSkip={handleSkipPhotosClick}
            />
          )
        ) : null}

        {photoTab === "missing" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload photos for each product in your estimate. Click on a slot to add photos (up to 2 per slot).
            </p>
            {uploadError && (
              <div className="rounded-md bg-error-bg p-3 text-sm text-error">
                {uploadError}
              </div>
            )}
            {estimateId && locationId ? (
              <ProductPhotoUpload
                estimateId={estimateId}
                locationId={locationId}
                initialAction={autoTriggerUpload ? "upload" : undefined}
                onInitialActionHandled={() => setAutoTriggerUpload(false)}
                onUploadComplete={handleUploadComplete}
                onError={handleUploadError}
              />
            ) : (
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/40 p-6 text-center">
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <p className="font-medium text-foreground">Loading...</p>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-border bg-background p-6">
              <p className="font-medium text-foreground">Can't share photos?</p>
              <p className="text-sm text-muted-foreground mt-2">
                That's okay—you can skip this step and we'll call to confirm details.
              </p>
              <Button variant="outline" className="mt-4" onClick={handleSkipPhotosClick}>
                Skip photos for now
              </Button>
            </div>
            {photosSkipped && (
              <div className="rounded-md bg-info-bg p-3 text-sm text-info">
                Photos skipped. We'll call you to confirm details before installation.
              </div>
            )}
          </div>
        ) : null}

        {photoTab === "samples" ? (
          <div className="space-y-4">
            <p>Here's what our install team typically needs:</p>
            <ul className="grid gap-4 md:grid-cols-3">
              {samples.map((sample) => (
                <li key={sample.id} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="overflow-hidden rounded-md bg-muted">
                    <img src={sample.url} alt={sample.title} className="aspect-video w-full object-cover" />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">{sample.title}</div>
                    <p>{sample.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      {/* Skip Photos Confirmation Dialog */}
      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Photo Upload?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to skip uploading photos? We'll call you to confirm details instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkipPhotosConfirm}>
              Skip Photos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
});

