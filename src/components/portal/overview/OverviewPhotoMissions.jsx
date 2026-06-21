import { useMemo, useState } from "react";
import { ChevronRight, Camera } from "lucide-react";
import { useEstimate, useEstimatePhotos } from "../../../lib/react-query/hooks";
import { UploadModal, groupPhotosByProduct } from "../photo-upload";
import { Spinner } from "../../ui/spinner";

/**
 * Slim photo mission rows (mock layout) with inline UploadModal on tap.
 */
export function OverviewPhotoMissions({ estimateId, locationId, view, onOpenPhotosTab }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: estimateData, isLoading } = useEstimate({
    estimateId,
    locationId,
    enabled: !!estimateId,
  });

  const { data: photosData } = useEstimatePhotos({
    estimateId,
    enabled: !!estimateId,
  });

  const missions = useMemo(() => {
    if (!estimateData?.ok || !estimateData.items) return [];

    const itemsMeta = view?.itemsMeta || {};
    const photosByProduct = groupPhotosByProduct(photosData?.stored?.uploads || []);
    const grouped = {};

    estimateData.items.forEach((item) => {
      const name = item.name || "Unknown Item";
      const metaForItem = itemsMeta[name];
      if (metaForItem?.isHeading) return;

      const itemRequiresPhoto = metaForItem
        ? typeof metaForItem.photoRequired === "boolean"
          ? metaForItem.photoRequired
          : !(item.isCustom || metaForItem.isCustom)
        : item.photoRequired !== false && !item.isCustom;

      if (!itemRequiresPhoto) return;

      const qty = item.qty || item.quantity || 1;
      if (!grouped[name]) {
        grouped[name] = {
          name,
          quantity: 0,
          required: true,
          photos: [],
          maxPhotos: qty,
        };
      }
      grouped[name].quantity += qty;
      grouped[name].maxPhotos = grouped[name].quantity;
    });

    Object.keys(grouped).forEach((name) => {
      if (photosByProduct[name]) {
        grouped[name].photos = Object.values(photosByProduct[name]).flat();
      }
    });

    return Object.values(grouped);
  }, [estimateData, photosData, view?.itemsMeta]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6">
        <Spinner size="sm" />
        <span className="text-sm text-muted-foreground">Loading photo missions…</span>
      </div>
    );
  }

  if (missions.length === 0) return null;

  const isGuestMode = view?.isGuestMode ?? false;

  return (
    <>
      <div className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Photo missions</h2>
          <p className="text-xs text-muted-foreground">
            Tap a mission to add photos from your phone — we may reduce your quote after review.
          </p>
        </div>

        {missions.map((mission) => {
          const uploaded = mission.photos?.length ?? 0;
          const needed = mission.maxPhotos || mission.quantity || 1;
          const thumb = mission.photos?.[0]?.url;

          return (
            <button
              key={mission.name}
              type="button"
              disabled={isGuestMode}
              onClick={() => !isGuestMode && setSelectedProduct(mission)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-60"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Camera className="h-5 w-5" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{mission.name}</p>
                <p className={`text-xs font-medium ${uploaded >= needed ? "text-success" : "text-error"}`}>
                  {uploaded} / {needed} uploaded
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          );
        })}

        {onOpenPhotosTab && (
          <button
            type="button"
            onClick={onOpenPhotosTab}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Open full photo manager
          </button>
        )}
      </div>

      {selectedProduct && (
        <UploadModal
          product={selectedProduct}
          estimateId={estimateId}
          locationId={locationId}
          view={view}
          onClose={() => setSelectedProduct(null)}
          onSave={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
}
