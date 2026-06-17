import { createElement, useState, useRef } from "react";
import {
  Camera,
  Check,
  Minus,
  X,
  Pencil,
  Loader2,
  Package,
  Radar,
  DoorOpen,
  Grid3x3,
  Siren,
  Cpu,
  BatteryCharging,
  Square,
  Home,
} from "lucide-react";
import {
  DEFAULT_DEVICE_MAX_PHOTOS,
  MAX_DEVICE_PHOTOS_PER_LINE,
  PROPERTY_PHOTOS_MAX,
} from "./photo-constants";

/**
 * Inline photo card matching the customer-portal mockup template
 * (`portal-dashboard-mockup.html` → `<template id="photoCardTpl">`).
 *
 * Each card owns a fixed grid of "slots" (`maxPhotos`). A slot is either
 * empty (camera input), uploading (progress overlay), or filled (image +
 * delete button). Below the slots we render a "Can't take a photo?" /
 * "Add note" actions row, plus collapsible skip & note panels.
 *
 * Upload + delete are delegated to the parent so PhotoUploadView can keep
 * a single upload session and React Query cache.
 */

// Map common alarm-product names to a Lucide icon. Rendered via a wrapper so
// the React Compiler doesn't trip its "no component creation during render"
// rule when callers want the resolved icon as JSX.
function resolveProductIcon(name) {
  const n = (name || "").toLowerCase();
  if (/sensor|pir|motion/.test(n)) return Radar;
  if (/door|window|contact/.test(n)) return DoorOpen;
  if (/keypad/.test(n)) return Grid3x3;
  if (/siren/.test(n)) return Siren;
  if (/hub|control|panel/.test(n)) return Cpu;
  if (/battery/.test(n)) return BatteryCharging;
  if (/glass/.test(n)) return Square;
  return Package;
}

function ProductIcon({ name, className }) {
  // createElement keeps the React Compiler happy (avoids the
  // "no component creation during render" rule that fires on
  // `const C = ...; <C />`).
  return createElement(resolveProductIcon(name), { className });
}

// The pill shown in the card header next to the product name.
function RequirementPill({ photoAllowed, required }) {
  if (!photoAllowed) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-muted text-muted-foreground">
        No photo
      </span>
    );
  }
  if (required) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-error-bg text-error">
        Required
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-muted text-foreground">
      Optional
    </span>
  );
}

// Single 4:3 photo slot. `slot` shape:
//   { kind: 'empty' } | { kind: 'uploading', thumbnailUrl, progress }
//   | { kind: 'filled', photo: { url, attachmentId } }
function PhotoSlot({ slot, index, disabled, onPick, onDelete }) {
  const inputRef = useRef(null);
  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    if (e.target) e.target.value = ""; // allow re-selecting same file
  };

  if (slot.kind === "filled" || slot.kind === "uploading") {
    const isUploading = slot.kind === "uploading";
    const src = isUploading ? slot.thumbnailUrl : slot.photo?.url;
    return (
      <div className="slot relative aspect-[4/3] rounded-xl overflow-hidden bg-muted group/slot">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        {isUploading ? (
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
            <div className="text-background text-[11px] font-semibold text-center">
              <Loader2 className="h-6 w-6 mx-auto mb-1 animate-spin" />
              <span>{slot.progress ?? 0}%</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-foreground/60 hover:bg-error text-background flex items-center justify-center backdrop-blur transition opacity-0 group-hover/slot:opacity-100 focus:opacity-100"
            aria-label={`Delete photo ${index + 1}`}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground/60 text-background">
          Photo {index + 1}
        </span>
      </div>
    );
  }

  return (
    <label
      className={`slot relative aspect-[4/3] rounded-xl bg-muted/50 border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 transition group/slot overflow-hidden ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-primary hover:bg-primary/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={onChange}
        disabled={disabled}
      />
      <Camera className="h-7 w-7 text-muted-foreground group-hover/slot:text-primary transition" strokeWidth={1.6} />
      <span className="text-[11px] font-medium text-muted-foreground group-hover/slot:text-primary">
        Tap to add
      </span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
        Photo {index + 1}
      </span>
    </label>
  );
}

// Status indicator (top-right of card header). Shape mirrors the mockup's
// applyPhotoStatus() switch.
function StatusIndicator({ status, filledCount, maxPhotos }) {
  if (status === "ready") {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-success">
        <Check className="h-4 w-4 text-success-foreground" strokeWidth={3} />
      </div>
    );
  }
  if (status === "partial") {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-secondary">
        <span className="text-secondary-foreground text-[10px] font-bold">
          {filledCount}/{maxPhotos}
        </span>
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-warning">
        <Minus className="h-3.5 w-3.5 text-warning-foreground" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "needed") {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-error-bg">
        <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
      </div>
    );
  }
  if (status === "na") {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-muted">
        <Minus className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
      </div>
    );
  }
  // 'optional' (no photos yet, not required)
  return <div className="w-7 h-7 rounded-full shrink-0" />;
}

function statusText({ status, filledCount, maxPhotos, skipReason }) {
  if (status === "ready") {
    return {
      text: `${maxPhotos} photo${maxPhotos > 1 ? "s" : ""} added`,
      cls: "text-success",
    };
  }
  if (status === "partial") {
    return {
      text: `${filledCount} of ${maxPhotos} added`,
      cls: "text-secondary",
    };
  }
  if (status === "skipped") {
    return { text: `Skipped — ${skipReason || "no reason"}`, cls: "text-warning" };
  }
  if (status === "needed") {
    return { text: "Photo needed", cls: "text-error" };
  }
  if (status === "na") {
    return { text: "No action needed", cls: "text-muted-foreground" };
  }
  return { text: "Optional", cls: "text-muted-foreground" };
}

/**
 * @param {{
 *   product: {
 *     name: string,
 *     quantity: number,
 *     required: boolean,
 *     photoAllowed: boolean,
 *     maxPhotos: number,
 *     skipReason?: string,
 *     note?: string,
 *   },
 *   slots: Array<{ kind: 'empty' | 'uploading' | 'filled', thumbnailUrl?: string, progress?: number, photo?: any }>,
 *   filledCount: number,
 *   status: 'ready' | 'partial' | 'skipped' | 'needed' | 'optional' | 'na',
 *   isSubmitted: boolean,
 *   hasError?: boolean,
 *   onUpload: (slotIndex: number, file: File) => void,
 *   onDelete: (photo: any) => void,
 *   onSkip: (reason: string) => void,
 *   onUnskip: () => void,
 *   onNoteChange: (note: string) => void,
 * }} props
 */
export function MissionPhotoCard({
  product,
  slots,
  filledCount,
  status,
  isSubmitted = false,
  hasError = false,
  onUpload,
  onDelete,
  onSkip,
  onUnskip,
  onNoteChange,
}) {
  const photoAllowed = product.photoAllowed !== false;
  const maxPhotos = product.isVirtual
    ? Math.max(1, Math.min(PROPERTY_PHOTOS_MAX, product.maxPhotos || PROPERTY_PHOTOS_MAX))
    : Math.max(1, Math.min(MAX_DEVICE_PHOTOS_PER_LINE, product.maxPhotos || DEFAULT_DEVICE_MAX_PHOTOS));

  const [showSkipPanel, setShowSkipPanel] = useState(false);
  const [skipDraft, setSkipDraft] = useState(product.skipReason || "");
  const [showNotePanel, setShowNotePanel] = useState(Boolean(product.note));
  const [noteDraft, setNoteDraft] = useState(product.note || "");

  const meta = statusText({
    status,
    filledCount,
    maxPhotos,
    skipReason: product.skipReason,
  });

  const disableSlots = isSubmitted || status === "skipped";

  const handleConfirmSkip = () => {
    const reason = skipDraft.trim();
    if (!reason) return;
    onSkip?.(reason);
    setShowSkipPanel(false);
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNoteDraft(value);
    onNoteChange?.(value);
  };

  return (
    <article
      className={`bg-surface rounded-2xl shadow-sm border overflow-hidden transition-all ${
        hasError ? "border-error/60 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : "border-border-subtle"
      } ${status === "optional" ? "opacity-90" : ""} ${status === "na" ? "opacity-70" : ""}`}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {product.isVirtual ? (
            createElement(Home, {
              className: `h-5 w-5 ${photoAllowed ? "text-primary" : "text-muted-foreground"}`,
            })
          ) : (
            <ProductIcon
              name={product.name}
              className={`h-5 w-5 ${photoAllowed ? "text-primary" : "text-muted-foreground"}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground leading-tight truncate">
              {product.displayName || product.name}
            </h3>
            {!product.isVirtual && product.quantity > 1 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                x{product.quantity}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <RequirementPill photoAllowed={photoAllowed} required={product.required} />
            <span className={`text-[11px] font-medium truncate ${meta.cls}`}>{meta.text}</span>
          </div>
        </div>
        <StatusIndicator
          status={status}
          filledCount={filledCount}
          maxPhotos={maxPhotos}
        />
      </header>

      {photoAllowed && product.isVirtual ? (
        <p className="px-4 text-xs text-muted-foreground leading-snug -mt-1 mb-2">
          Please include a mix of interior and exterior shots where you can — these help the crew plan access and cable runs.
        </p>
      ) : null}

      {photoAllowed ? (
        <div className="px-4 pb-3">
          <div className="overflow-x-auto pb-1">
            <div
              className="inline-grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${maxPhotos}, minmax(96px, 140px))`,
              }}
            >
            {slots.map((slot, idx) => (
              <PhotoSlot
                key={idx}
                slot={slot}
                index={idx}
                disabled={disableSlots}
                onPick={(file) => onUpload?.(idx, file)}
                onDelete={() => slot.photo && onDelete?.(slot.photo)}
              />
            ))}
            </div>
          </div>

          {!isSubmitted && (
            <div
              className={`mt-2 flex items-center gap-2 ${product.isVirtual ? "justify-end" : "justify-between"}`}
            >
              {!product.isVirtual ? (
                status === "skipped" ? (
                  <button
                    type="button"
                    onClick={() => onUnskip?.()}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2"
                  >
                    Undo skip
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSkipPanel((v) => !v)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2"
                  >
                    Can&apos;t take a photo?
                  </button>
                )
              ) : null}
              <button
                type="button"
                onClick={() => setShowNotePanel((v) => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>{showNotePanel ? "Hide note" : "Add note"}</span>
              </button>
            </div>
          )}

          {showNotePanel && !isSubmitted && (
            <div className="mt-2">
              <textarea
                value={noteDraft}
                onChange={handleNoteChange}
                rows={2}
                placeholder="e.g. Front door, near porch light"
                className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          )}

          {showSkipPanel && !isSubmitted && !product.isVirtual && status !== "skipped" && (
            <div className="mt-2 bg-warning-bg rounded-lg p-2.5 border border-warning/30">
              <label className="text-[11px] font-semibold text-warning block mb-1">
                Why can&apos;t you add a photo?
              </label>
              <input
                type="text"
                value={skipDraft}
                onChange={(e) => setSkipDraft(e.target.value)}
                placeholder="e.g. Tenant not home until install day"
                className="w-full text-xs p-2 rounded border border-warning/30 bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-warning/20"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSkipPanel(false);
                    setSkipDraft("");
                  }}
                  className="text-[11px] text-muted-foreground px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSkip}
                  disabled={!skipDraft.trim()}
                  className="text-[11px] font-semibold text-warning ml-auto px-3 py-1 bg-surface rounded border border-warning/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm skip
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pb-3">
          <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
            <Minus className="h-3.5 w-3.5" />
            No photo needed for this product
          </div>
        </div>
      )}
    </article>
  );
}
