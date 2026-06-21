import { Camera, CreditCard, FileText, Headphones, Home, Settings, X } from "lucide-react";
import { BRAND } from "../../../config/brand";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "estimates", label: "Estimates", icon: FileText },
  { id: "photos", label: "Install Photos", icon: Camera, badgeKey: "photos" },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "support", label: "Support", icon: Headphones },
  { id: "preferences", label: "Preferences", icon: Settings },
];

export function PortalMobileMenu({
  open,
  onOpenChange,
  activeNav,
  onNavChange,
  onPhotosClick,
  badges = {},
}) {
  if (!open) return null;

  const handleNav = (itemId) => {
    if (itemId === "photos" && onPhotosClick) {
      onPhotosClick();
    } else {
      onNavChange(itemId);
    }
    onOpenChange(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-50 bg-foreground/40 md:hidden"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background shadow-xl md:hidden"
        aria-label={`${BRAND.name} navigation`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {BRAND.name}
            </p>
            <p className="text-sm font-semibold text-foreground">Customer Portal</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              const badge = item.badgeKey ? badges[item.badgeKey] : null;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="relative">
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                      {badge ? (
                        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                          {badge}
                        </span>
                      ) : null}
                    </span>
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
