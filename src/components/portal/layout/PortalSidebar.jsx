import { useState } from "react";
import { Sparkles, ListChecks, CreditCard, MessageCircle, Settings } from "lucide-react";
import { Button } from "../../ui/button";
import { Sidebar as UISidebar } from "../../ui/sidebar";
import { SignOutButton } from "../../ui/sign-out-button";

const CUSTOMER_NAV_ITEMS = [
  { label: "Overview", icon: Sparkles, href: "#overview" },
  { label: "Estimates", icon: ListChecks, href: "#estimates" },
  { label: "Payments", icon: CreditCard, href: "#payments" },
  { label: "Support", icon: MessageCircle, href: "#support" },
  { label: "Preferences", icon: Settings, href: "#preferences" },
];

export function PortalSidebar({ activeNav, onNavChange, estimateId, onBackToList, support }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (href) => {
    const itemId = href.replace("#", "");
    if (itemId === "estimates" && estimateId) {
      onBackToList();
    } else {
      onNavChange(itemId);
    }
    setMobileOpen(false);
  };

  // Map activeNav to href format
  const activeItem = activeNav ? `#${activeNav}` : null;

  return (
    <>
      <UISidebar
        variant="gradient"
        navItems={CUSTOMER_NAV_ITEMS}
        activeItem={activeItem}
        title="Customer Portal"
        subtitle="Operations & concierge"
        showFooter={false}
        showHeader={true}
        enableSearch={false}
        enableRecentItems={false}
        enablePinnedItems={false}
        enableNestedNav={false}
        onNavChange={handleNavClick}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        inContainer={false}
      >
        {/* Custom footer with help section and sign out */}
        <div className="flex flex-col h-full max-h-screen">
          {/* Header */}
          <div className="px-6 py-6 border-b border-primary/10">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground font-medium">CheapAlarms</p>
            <p className="mt-2 text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Customer Portal
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Operations & concierge</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {CUSTOMER_NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.href;
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  variant={isActive ? "default" : "ghost"}
                  className={`flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-all duration-fast ease-standard relative group ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md"
                      : ""
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Custom Footer */}
          <div className="border-t border-primary/10 px-6 py-4 space-y-4">
            {support?.specialist?.name && (
              <div className="rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 p-4 border border-primary/20">
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Need help?</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Contact {support.specialist.name}{support.specialist.role ? `, ${support.specialist.role}` : ""}.
                </p>
                {support.specialist.phone && (
                  <p className="text-xs text-muted-foreground">{support.specialist.phone}</p>
                )}
                {support.specialist.email && (
                  <a href={`mailto:${support.specialist.email}`} className="text-xs text-primary underline">
                    {support.specialist.email}
                  </a>
                )}
              </div>
            )}
            <SignOutButton />
          </div>
        </div>
      </UISidebar>
    </>
  );
}

