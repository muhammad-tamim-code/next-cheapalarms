import { Home, FileText, Camera, CreditCard, Headphones } from "lucide-react";
import { BRAND } from "../../../config/brand";

const TABS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "estimates", label: "Estimates", icon: FileText },
  { id: "photos", label: "Install Photos", icon: Camera, badgeKey: "photos" },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "support", label: "Support", icon: Headphones },
];

export function PortalBottomNav({ activeNav, badges = {}, onNavChange, onPhotosClick }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label={`${BRAND.name} portal navigation`}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeNav === tab.id;
          const badge = tab.badgeKey ? badges[tab.badgeKey] : null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === "photos" && onPhotosClick) {
                  onPhotosClick();
                } else {
                  onNavChange(tab.id);
                }
              }}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                {badge ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
