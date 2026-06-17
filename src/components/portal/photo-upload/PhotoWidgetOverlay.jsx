import { useEffect } from "react";
import { X } from "lucide-react";
import { PhotoUploadView } from "./PhotoUploadView";

/**
 * Photo Widget Overlay - Gemini pattern implementation
 * Slides in from right on desktop (480px drawer)
 * Full screen on mobile
 */
export function PhotoWidgetOverlay({ isOpen, onClose, estimateId, locationId, view }) {
  // Prevent body scroll when open (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Handle ESC key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  // Don't render on server or when closed
  if (!isOpen) return null;
  if (typeof window === 'undefined') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Widget Container - Side drawer on desktop, full screen on mobile */}
      <div className="relative w-full h-full md:w-[480px] bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Close button - visible on mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-background/90 backdrop-blur rounded-full shadow-lg hover:bg-background transition-colors md:hidden"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <PhotoUploadView 
            estimateId={estimateId}
            locationId={locationId}
            view={view}
            onComplete={onClose}
          />
        </div>
      </div>
    </div>
  );
}

