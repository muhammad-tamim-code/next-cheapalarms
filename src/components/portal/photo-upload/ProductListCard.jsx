import { ChevronRight, Package } from "lucide-react";
import { StatusPill } from "./StatusPill";

/**
 * Product card component for photo upload list
 * Shows product name, quantity, status, and thumbnail preview
 */
export function ProductListCard({ 
  product, 
  onClick, 
  hasError = false 
}) {
  const { name, quantity, photos = [], status, required } = product;
  const showThumbnails = photos.length > 0;
  
  return (
    <div
      onClick={onClick}
      className={`
        relative bg-background rounded-2xl p-4 border transition-all active:scale-[0.99] cursor-pointer
        ${hasError 
          ? 'border-error/50 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' 
          : 'border-border-subtle shadow-sm hover:shadow-md hover:border-border'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon Area */}
        <div className={`
          w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
          ${status === 'ready' ? 'bg-primary/10' : 'bg-muted'}
        `}>
          <Package className={`h-6 w-6 ${status === 'ready' ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1 gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {name}
              </h3>
              {quantity > 1 && (
                <span className="mt-0.5 inline-block text-[11px] font-medium text-muted-foreground">
                  {quantity} units
                </span>
              )}
            </div>
            <div className="shrink-0">
              <StatusPill status={status} required={required} />
            </div>
          </div>

          {/* Helper Text */}
          <p className={`text-xs mb-3 ${hasError ? 'text-error font-medium' : 'text-muted-foreground'}`}>
            {hasError 
              ? "Photo required to submit" 
              : status === 'skipped' 
                ? 'Skipped (no photo)' 
                : status === 'ready'
                  ? `${photos.length} photo${photos.length !== 1 ? 's' : ''} added`
                  : required
                    ? 'Tap to take a photo'
                    : 'Tap to add (optional)'
            }
          </p>

          {/* Thumbnails */}
          {showThumbnails && (
            <div className="flex -space-x-2">
              {photos.slice(0, 3).map((photo, idx) => (
                <div 
                  key={photo.attachmentId || photo.url || idx} 
                  className="w-8 h-8 rounded-lg border-2 border-background overflow-hidden bg-muted relative z-0"
                >
                  <img 
                    src={photo.url} 
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover" 
                  />
                </div>
              ))}
              {photos.length > 3 && (
                <div className="w-8 h-8 rounded-lg border-2 border-background overflow-hidden bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +{photos.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Chevron for affordance */}
        {!showThumbnails && (
          <div className="self-center text-muted-foreground/50">
            <ChevronRight size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

