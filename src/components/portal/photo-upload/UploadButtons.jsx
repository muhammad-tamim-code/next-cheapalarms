import { Camera, Image as ImageIcon } from "lucide-react";
import { useRef, useState, useEffect } from "react";

/**
 * Upload buttons component - Camera and Gallery options
 * Big, easy-to-tap buttons for mobile
 */
export function UploadButtons({ onFileSelect, uploading = false }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  // Detect mobile after mount to avoid SSR hydration mismatch
  // Server and first client render both see isMobile=false
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Support multiple file selection
      onFileSelect(e.target.files);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {/* Camera Button (Mobile) or Camera Button (Desktop) */}
        {isMobile ? (
          <button 
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-2 py-6 bg-primary/5 border border-primary/20 rounded-xl text-primary font-medium hover:bg-primary/10 transition-colors active:scale-95 disabled:opacity-50"
          >
            <Camera size={28} />
            <span className="text-sm">Take a photo</span>
          </button>
        ) : (
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-2 py-6 bg-primary/5 border border-primary/20 rounded-xl text-primary font-medium hover:bg-primary/10 transition-colors active:scale-95 disabled:opacity-50"
          >
            <Camera size={28} />
            <span className="text-sm">Take a photo</span>
          </button>
        )}
        
        {/* Gallery Button (Mobile) or File Button (Desktop) */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 py-6 bg-muted border border-border-subtle rounded-xl text-muted-foreground font-medium hover:bg-muted/80 transition-colors active:scale-95 disabled:opacity-50"
        >
          <ImageIcon size={28} />
          <span className="text-sm">{isMobile ? 'Gallery' : 'Upload file'}</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
        multiple
      />
      {isMobile && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
      )}
    </>
  );
}

