import { cn } from "../../../lib/utils";

/**
 * Topbar - Admin header with page title and icon
 * Shows immediate feedback when navigating (GHL-style)
 */
export function Topbar({ title, icon: Icon, isNavigating = false }) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex items-center px-6 py-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon
              className={cn(
                "h-6 w-6 text-primary transition-all duration-fast ease-standard",
                isNavigating && "animate-pulse"
              )}
            />
          )}
          <h1 className="text-xl font-semibold text-foreground transition-opacity duration-fast ease-standard">
            {title || "Admin"}
          </h1>
        </div>
      </div>
    </div>
  );
}


