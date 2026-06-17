import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MissionPhotoCard } from "./MissionPhotoCard";
import { ProgressBar } from "./ProgressBar";
import { StickySubmitBar } from "./StickySubmitBar";
import { useEstimate, useEstimatePhotos, useStoreEstimatePhotos } from "../../../lib/react-query/hooks";
import { Spinner } from "../../ui/spinner";
import { getWpNonceSafe } from "../../../lib/api/get-wp-nonce";
import {
  startUploadSession,
  uploadFile,
  compressImage,
  getCurrentSession,
  UPLOAD_CONFIG,
} from "../../../lib/uploadApi";
import {
  HOUSE_PHOTOS_ITEM_KEY,
  DEFAULT_DEVICE_MAX_PHOTOS,
  MAX_DEVICE_PHOTOS_PER_LINE,
  PROPERTY_PHOTOS_MAX,
} from "./photo-constants";

/**
 * Customer-facing install-photo workflow.
 *
 * Visual layout matches `portal-dashboard-mockup.html`'s "VIEW: PHOTOS":
 *   - sticky header card (title + intro + progress + sub-stats + filter tabs)
 *   - per-product MissionPhotoCard with inline photo slots (no modal)
 *   - sticky submit row at the bottom
 *
 * The upload pipeline is centralised here so a single upload session is
 * shared across cards and React Query cache stays consistent.
 */

const PHOTO_FILTERS = [
  { id: "all",        label: "All" },
  { id: "required",   label: "Required" },
  { id: "optional",   label: "Optional" },
  { id: "incomplete", label: "Needs photo" },
];

// Resolve a product's status from saved photos + skip state, mirroring the
// mockup's photoStatusOf() helper. Returns one of:
//   'na' | 'skipped' | 'ready' | 'partial' | 'needed' | 'optional'
function computeProductStatus({ photoAllowed, required, skipReason, filledCount, maxPhotos }) {
  if (!photoAllowed && !required) return "na";
  if (skipReason && skipReason.trim()) return "skipped";
  if (filledCount >= maxPhotos && maxPhotos > 0) return "ready";
  if (filledCount > 0) return "partial";
  if (required) return "needed";
  return "optional";
}

// Sort all uploads belonging to a product so slot N always lands at index N.
function sortPhotosForProduct(uploads) {
  return [...uploads].sort((a, b) => {
    const ai = Number(a.slotIndex ?? a.photoIndex ?? 0);
    const bi = Number(b.slotIndex ?? b.photoIndex ?? 0);
    if (ai !== bi) return ai - bi;
    return Number(a.attachmentId || 0) - Number(b.attachmentId || 0);
  });
}

/** Clamp install-photo slot count for real line items (1–3, default 2). */
function clampDeviceMaxPhotos(meta) {
  const raw = meta?.maxPhotos;
  const n = Number(raw);
  const base = Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_DEVICE_MAX_PHOTOS;
  return Math.min(MAX_DEVICE_PHOTOS_PER_LINE, Math.max(1, base));
}

export function PhotoUploadView({ estimateId, locationId, onComplete, view }) {
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [savingStatus, setSavingStatus] = useState("idle"); // 'idle' | 'saving' | 'saved'
  // In-flight uploads keyed by `${productName}::${slotIndex}`. Drives the
  // uploading-overlay state on individual photo slots.
  const [inFlight, setInFlight] = useState({});
  // Local-only skip / note state per product. Persisted to backend would
  // require schema work; for now this lives until the user navigates away.
  const [productLocalState, setProductLocalState] = useState({});

  const queryClient = useQueryClient();
  const storePhotosMutation = useStoreEstimatePhotos();
  const isMountedRef = useRef(true);
  const savedFlashTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    };
  }, []);

  const submissionStatus = view?.photos?.submission_status;
  const isAlreadySubmitted = submissionStatus === "submitted";
  const submittedAt = view?.photos?.submitted_at;

  const { data: estimateData, isLoading: loadingEstimate, error: estimateError } = useEstimate({
    estimateId,
    locationId,
    enabled: !!estimateId,
  });

  const { data: photosData, isLoading: loadingPhotos } = useEstimatePhotos({
    estimateId,
    enabled: !!estimateId,
  });

  // Stable reference so it can be a clean dep for the products memo below.
  const itemsMeta = useMemo(() => view?.itemsMeta || {}, [view?.itemsMeta]);

  // Build the list of products for the photo checklist. itemsMeta entries
  // (keyed by item name) override defaults: `isHeading` removes the item,
  // `photoRequired` toggles the requirement, `photoAllowed`/`maxPhotos`
  // override slot defaults.
  const products = useMemo(() => {
    if (!estimateData?.ok || !estimateData.items) return [];

    const allUploads = photosData?.stored?.uploads || [];
    const photosByName = {};
    allUploads.forEach((upload) => {
      const name = upload.itemName || "Unknown";
      if (!photosByName[name]) photosByName[name] = [];
      photosByName[name].push(upload);
    });

    const grouped = {};
    estimateData.items.forEach((item) => {
      const name = item.name || "Unknown Item";
      const meta = itemsMeta[name];
      if (meta?.isHeading) return;

      const required = meta
        ? typeof meta.photoRequired === "boolean"
          ? meta.photoRequired
          : !(item.isCustom || meta.isCustom)
        : item.photoRequired !== false && !item.isCustom;

      const photoAllowed = meta?.photoAllowed ?? true;
      const maxPhotos = clampDeviceMaxPhotos(meta);

      if (!grouped[name]) {
        grouped[name] = {
          name,
          quantity: 0,
          required,
          photoAllowed,
          maxPhotos,
          isCustom: item.isCustom || false,
          rawPhotos: sortPhotosForProduct(photosByName[name] || []),
        };
      } else {
        grouped[name].required = grouped[name].required || itemRequiresPhoto;
      }
      grouped[name].quantity += item.qty || item.quantity || 1;
    });

    const deviceProducts = Object.values(grouped);
    if (deviceProducts.some((p) => p.name === HOUSE_PHOTOS_ITEM_KEY)) {
      return deviceProducts;
    }

    return [
      ...deviceProducts,
      {
        name: HOUSE_PHOTOS_ITEM_KEY,
        displayName: "Property photos",
        quantity: 1,
        required: false,
        photoAllowed: true,
        maxPhotos: PROPERTY_PHOTOS_MAX,
        isCustom: false,
        isVirtual: true,
        rawPhotos: sortPhotosForProduct(photosByName[HOUSE_PHOTOS_ITEM_KEY] || []),
      },
    ];
  }, [estimateData, photosData, itemsMeta]);

  // Decorate each product with derived `slots`, `filledCount`, `status`,
  // and merge in local skip/note state. Each entry is what we render.
  const decoratedProducts = useMemo(() => {
    return products.map((product) => {
      const local = productLocalState[product.name] || {};
      const skipReason = local.skipReason || "";
      const note = local.note || "";

      const slots = [];
      let filledCount = 0;
      for (let i = 0; i < product.maxPhotos; i++) {
        const inFlightSlot = inFlight[`${product.name}::${i}`];
        const photo = product.rawPhotos[i];
        if (inFlightSlot) {
          slots.push({ kind: "uploading", ...inFlightSlot });
        } else if (photo) {
          slots.push({ kind: "filled", photo });
          filledCount += 1;
        } else {
          slots.push({ kind: "empty" });
        }
      }

      const status = computeProductStatus({
        photoAllowed: product.photoAllowed,
        required: product.required,
        skipReason,
        filledCount,
        maxPhotos: product.maxPhotos,
      });

      return { ...product, skipReason, note, slots, filledCount, status };
    });
  }, [products, inFlight, productLocalState]);

  // Counts shown on filter tab labels.
  const filterCounts = useMemo(() => {
    const counts = { all: decoratedProducts.length, required: 0, optional: 0, incomplete: 0 };
    decoratedProducts.forEach((p) => {
      if (p.required) counts.required += 1;
      else counts.optional += 1;
      if (p.required && (p.status === "needed" || p.status === "partial")) {
        counts.incomplete += 1;
      }
    });
    return counts;
  }, [decoratedProducts]);

  const visibleProducts = useMemo(() => {
    switch (activeFilter) {
      case "required":
        return decoratedProducts.filter((p) => p.required);
      case "optional":
        return decoratedProducts.filter((p) => !p.required);
      case "incomplete":
        return decoratedProducts.filter(
          (p) => p.required && (p.status === "needed" || p.status === "partial")
        );
      case "all":
      default:
        return decoratedProducts;
    }
  }, [decoratedProducts, activeFilter]);

  // Aggregate progress numbers for the header card and submit-bar messaging.
  const progress = useMemo(() => {
    let req = 0;
    let reqDone = 0;
    let opt = 0;
    let optDone = 0;
    decoratedProducts.forEach((p) => {
      if (p.required) {
        req += 1;
        if (p.status === "ready" || p.status === "skipped") reqDone += 1;
      } else if (p.photoAllowed) {
        opt += 1;
        if (p.status === "ready") optDone += 1;
      }
    });
    return {
      total: req,
      completed: reqDone,
      percent: req === 0 ? 100 : Math.round((reqDone / req) * 100),
      requiredLeft: req - reqDone,
      optionalTotal: opt,
      optionalDone: optDone,
    };
  }, [decoratedProducts]);

  const validation = useMemo(() => {
    const incomplete = decoratedProducts.filter(
      (p) => p.required && p.status !== "ready" && p.status !== "skipped"
    );
    return {
      isComplete: incomplete.length === 0,
      incompleteCount: incomplete.length,
      incompleteProducts: incomplete,
    };
  }, [decoratedProducts]);

  // ---------- Local state mutators ----------

  const setLocalForProduct = useCallback((name, patch) => {
    setProductLocalState((prev) => ({
      ...prev,
      [name]: { ...(prev[name] || {}), ...patch },
    }));
  }, []);

  const flashSaved = useCallback(() => {
    if (!isMountedRef.current) return;
    setSavingStatus("saved");
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    savedFlashTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setSavingStatus("idle");
    }, 1800);
  }, []);

  // ---------- Upload pipeline ----------

  const ensureSession = useCallback(async () => {
    const existing = getCurrentSession(estimateId);
    const now = Date.now() / 1000;
    const expired =
      existing?.exp != null &&
      existing.exp !== 0 &&
      typeof existing.exp === "number" &&
      existing.exp < now;
    if (existing && !expired && existing.estimateId === estimateId) return existing;
    return await startUploadSession(estimateId, locationId);
  }, [estimateId, locationId]);

  const buildThumbnail = useCallback(async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = UPLOAD_CONFIG.thumbnailSize;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          const scale = Math.max(size / img.width, size / img.height);
          const x = size / 2 - (img.width / 2) * scale;
          const y = size / 2 - (img.height / 2) * scale;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          resolve(canvas.toDataURL("image/jpeg", UPLOAD_CONFIG.thumbnailQuality));
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleUploadToSlot = useCallback(
    async (product, slotIndex, file) => {
      if (!file) return;
      if (isAlreadySubmitted) {
        toast.error("Photos already submitted", {
          description: "Resubmit-with-edit isn't enabled for this estimate.",
        });
        return;
      }
      const allowed = UPLOAD_CONFIG.supportedFormats.concat(["image/jpg"]);
      if (!file.type.startsWith("image/") || !allowed.includes(file.type.toLowerCase())) {
        toast.error("Invalid file type", {
          description: `${file.name} is not supported. Please use JPG, PNG, GIF, or WEBP.`,
        });
        return;
      }
      if (file.size > UPLOAD_CONFIG.maxFileSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error("File too large", {
          description: `${file.name} is ${sizeMB}MB. Max is ${(UPLOAD_CONFIG.maxFileSize / (1024 * 1024)).toFixed(0)}MB.`,
        });
        return;
      }

      const slotKey = `${product.name}::${slotIndex}`;
      const thumbnailUrl = await buildThumbnail(file);
      if (!isMountedRef.current) return;
      setInFlight((prev) => ({ ...prev, [slotKey]: { thumbnailUrl, progress: 0 } }));
      setSavingStatus("saving");

      try {
        await ensureSession();
        const compressed = await compressImage(file);
        const photoIndex = slotIndex + 1;
        const displayLabel = product.displayName || product.name;
        const metadata = {
          itemName: product.name,
          slotIndex: photoIndex,
          photoIndex,
          label: `${displayLabel} - Photo ${photoIndex}`,
        };

        const result = await uploadFile(
          compressed,
          metadata,
          (progressData) => {
            if (!isMountedRef.current) return;
            setInFlight((prev) => {
              if (!prev[slotKey]) return prev;
              return { ...prev, [slotKey]: { ...prev[slotKey], progress: progressData.progress } };
            });
          },
          null,
          estimateId
        );

        if (!result?.attachmentId || !result?.url) {
          throw new Error("Invalid upload response");
        }

        const newPhoto = {
          id: String(result.attachmentId),
          attachmentId: String(result.attachmentId),
          url: result.url,
          filename: compressed.name,
          label: metadata.label,
          status: "saved",
          ...metadata,
        };

        // Optimistically merge into the photos cache. Replace any photo
        // already saved at this slot for this product (rare race).
        queryClient.setQueryData(["estimate-photos", estimateId], (oldData) => {
          const existing =
            oldData?.ok && oldData?.stored?.uploads ? oldData.stored.uploads : [];
          const filtered = existing.filter(
            (p) =>
              !(
                p.itemName === product.name &&
                Number(p.slotIndex ?? p.photoIndex) === photoIndex
              )
          );
          return { ok: true, stored: { uploads: [...filtered, newPhoto] } };
        });

        const after = queryClient.getQueryData(["estimate-photos", estimateId]);
        const allUploads = after?.ok && after?.stored?.uploads ? after.stored.uploads : [];
        storePhotosMutation.mutate(
          { estimateId, locationId, uploads: allUploads },
          { onSuccess: flashSaved }
        );
      } catch (error) {
        toast.error("Upload failed", {
          description: error?.message || "Please try again.",
          duration: 5000,
        });
        if (isMountedRef.current) setSavingStatus("idle");
      } finally {
        if (isMountedRef.current) {
          setInFlight((prev) => {
            const next = { ...prev };
            delete next[slotKey];
            return next;
          });
        }
      }
    },
    [
      buildThumbnail,
      ensureSession,
      estimateId,
      locationId,
      queryClient,
      storePhotosMutation,
      flashSaved,
      isAlreadySubmitted,
    ]
  );

  const handleDeletePhoto = useCallback(
    (product, photo) => {
      if (isAlreadySubmitted) return;
      const cached = queryClient.getQueryData(["estimate-photos", estimateId]);
      const existing = cached?.ok && cached?.stored?.uploads ? cached.stored.uploads : [];
      const filtered = existing.filter((p) => {
        const sameAttachment =
          photo.attachmentId && p.attachmentId === photo.attachmentId;
        return !sameAttachment;
      });

      queryClient.setQueryData(["estimate-photos", estimateId], {
        ok: true,
        stored: { uploads: filtered },
      });
      setSavingStatus("saving");

      storePhotosMutation.mutate(
        { estimateId, locationId, uploads: filtered },
        {
          onSuccess: () => {
            flashSaved();
            toast.success("Photo removed", { duration: 1800 });
          },
          onError: (error) => {
            queryClient.setQueryData(["estimate-photos", estimateId], cached);
            toast.error("Failed to remove photo", {
              description: error?.message || "Please try again.",
            });
            if (isMountedRef.current) setSavingStatus("idle");
          },
        }
      );
    },
    [estimateId, locationId, queryClient, storePhotosMutation, flashSaved, isAlreadySubmitted]
  );

  const handleSkip = useCallback(
    (product, reason) => {
      setLocalForProduct(product.name, { skipReason: reason });
      // Clear any photos for this product since the user is opting out.
      const cached = queryClient.getQueryData(["estimate-photos", estimateId]);
      const existing = cached?.ok && cached?.stored?.uploads ? cached.stored.uploads : [];
      const filtered = existing.filter((p) => p.itemName !== product.name);
      if (filtered.length !== existing.length) {
        queryClient.setQueryData(["estimate-photos", estimateId], {
          ok: true,
          stored: { uploads: filtered },
        });
        setSavingStatus("saving");
        storePhotosMutation.mutate(
          { estimateId, locationId, uploads: filtered },
          { onSuccess: flashSaved }
        );
      } else {
        flashSaved();
      }
    },
    [setLocalForProduct, queryClient, estimateId, locationId, storePhotosMutation, flashSaved]
  );

  const handleUnskip = useCallback(
    (product) => {
      setLocalForProduct(product.name, { skipReason: "" });
    },
    [setLocalForProduct]
  );

  const handleNoteChange = useCallback(
    (product, value) => {
      setLocalForProduct(product.name, { note: value });
    },
    [setLocalForProduct]
  );

  const handleSubmitAll = async () => {
    if (!validation.isComplete) {
      setShowValidation(true);
      toast.error("Incomplete", {
        description: `${validation.incompleteCount} required item${validation.incompleteCount !== 1 ? "s" : ""} still need photos or to be skipped.`,
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const nonce = await getWpNonceSafe({
        inviteToken: view?.account?.inviteToken,
        estimateId,
      }).catch((err) => {
        const msg = err?.code === "AUTH_REQUIRED"
          ? "Session expired. Please log in again."
          : err?.message || "Failed to submit photos.";
        toast.error("Submission failed", { description: msg });
        return null;
      });
      if (!nonce) {
        setIsSubmitting(false);
        return;
      }
      const response = await fetch("/api/portal/submit-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        credentials: "include",
        body: JSON.stringify({
          estimateId,
          locationId,
          inviteToken: view?.account?.inviteToken || "",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.err || errorData.error || "Submission failed");
      }
      const result = await response.json();
      if (!result.ok) throw new Error(result.err || result.error || "Submission failed");

      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "portal-status" && query.queryKey[1] === estimateId,
        refetchType: "all",
      });

      toast.success("Photos submitted successfully", {
        description: "Your photos have been sent to the installation team.",
        duration: 4000,
      });
      onComplete?.();
    } catch (error) {
      toast.error("Submission failed", {
        description: error?.message || "Please try again.",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Render ----------

  if (loadingEstimate || loadingPhotos) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="ml-3 text-sm text-muted-foreground">Loading products...</p>
      </div>
    );
  }
  if (estimateError) {
    return (
      <div className="rounded-2xl border border-error/50 bg-error-bg p-6 text-error">
        <p className="font-semibold">Error loading estimate</p>
        <p className="text-sm mt-1">{estimateError.message}</p>
      </div>
    );
  }
  if (decoratedProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <p className="font-semibold text-foreground">No products found</p>
        <p className="text-sm text-muted-foreground mt-1">
          This estimate doesn&apos;t have any products yet.
        </p>
      </div>
    );
  }

  const savingLabel =
    savingStatus === "saving" ? "Saving…" : savingStatus === "saved" ? "✓ Auto-saved" : "";

  return (
    <div className="relative pb-32 space-y-4">
      {/* Header card — title, intro, progress, sub-stats, filter tabs */}
      <section className="bg-surface rounded-2xl shadow-sm border border-border-subtle p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Installation photos</h2>
          {savingLabel && (
            <span
              className={`text-[11px] font-medium ${
                savingStatus === "saving" ? "text-primary" : "text-success"
              }`}
              aria-live="polite"
            >
              {savingLabel}
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground leading-snug mb-4">
          Snap one or two photos of where each device will go. Installers use these to plan the visit.
        </p>

        {isAlreadySubmitted && (
          <div className="mb-4 rounded-xl border border-info/40 bg-info-bg p-3">
            <p className="text-sm font-medium text-info">
              ✓ Photos already submitted{submittedAt ? ` on ${formatDate(submittedAt)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can still review what you sent. Editing requires admin approval.
            </p>
          </div>
        )}

        <ProgressBar
          completed={progress.completed}
          total={progress.total}
          percent={progress.percent}
        />

        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-error" />
            {progress.requiredLeft} required left
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            {progress.optionalDone}/{progress.optionalTotal} optional
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-border-subtle flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PHOTO_FILTERS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                aria-pressed={isActive}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors ${
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-surface text-muted-foreground border-border-subtle hover:border-border hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 ${isActive ? "opacity-70" : "opacity-60"}`}>
                  {filterCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Card list */}
      <section className="space-y-3">
        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Nothing here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeFilter === "incomplete"
                ? "Every required photo is taken care of."
                : "No products match this filter."}
            </p>
          </div>
        ) : (
          visibleProducts.map((product) => {
            const hasError =
              showValidation && product.required && product.status === "needed";
            return (
              <MissionPhotoCard
                key={product.name}
                product={product}
                slots={product.slots}
                filledCount={product.filledCount}
                status={product.status}
                isSubmitted={isAlreadySubmitted}
                hasError={hasError}
                onUpload={(slotIndex, file) => handleUploadToSlot(product, slotIndex, file)}
                onDelete={(photo) => handleDeletePhoto(product, photo)}
                onSkip={(reason) => handleSkip(product, reason)}
                onUnskip={() => handleUnskip(product)}
                onNoteChange={(value) => handleNoteChange(product, value)}
              />
            );
          })
        )}
      </section>

      <StickySubmitBar
        isComplete={validation.isComplete}
        incompleteCount={validation.incompleteCount}
        onSubmit={handleSubmitAll}
        isSubmitting={isSubmitting}
        isResubmit={isAlreadySubmitted}
      />
    </div>
  );
}

// SSR-safe date formatting (matches the existing UTC-only style used in the
// previous PhotoUploadView so server/client renders agree).
function formatDate(input) {
  try {
    const date = new Date(input);
    if (isNaN(date.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  } catch {
    return "";
  }
}
