import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState, useCallback } from "react";
import {
  LayoutDashboard, Package, FileText, FilePlus2, Receipt, Mail, Users,
  UserCog, Settings, Plug, ScrollText, Search, Bell, ChevronDown, LogOut, Menu, X,
} from "lucide-react";
import { BRAND } from "../../../config/brand";
import { navItems } from "../nav";
import { hasPermission } from "../../../lib/auth/hasPermission";

/* Shared admin shell — the SINGLE source for the admin sidebar + topbar.
   Every admin page renders inside this, so the navigation is uniform across
   all tabs. Neutral / business-agnostic chrome; brand = logo slot + name. */

const NAV_ICONS = {
  "/admin": LayoutDashboard,
  "/admin/products": Package,
  "/admin/estimates": FileText,
  "/admin/quotes": FilePlus2,
  "/admin/invoices": Receipt,
  "/admin/invites": Mail,
  "/admin/customers": Users,
  "/admin/team": UserCog,
  "/admin/settings": Settings,
  "/admin/integrations": Plug,
  "/admin/logs": ScrollText,
};

export default function AdminLayout({ title, subtitle, authContext, children }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = useMemo(
    () =>
      navItems
        .filter((item) => !item.permission || hasPermission(authContext, item.permission))
        .map((item) => ({ ...item, Icon: NAV_ICONS[item.href] || LayoutDashboard })),
    [authContext]
  );

  const userName = authContext?.displayName || authContext?.email || "Admin";
  const userEmail = authContext?.email || "";
  const initials = userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const isActive = useCallback(
    (href) => (href === "/admin" ? router.pathname === "/admin" : router.pathname.startsWith(href)),
    [router.pathname]
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  }, [router]);

  const sidebar = (
    <>
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/admin" className="flex items-center gap-3">
          {/* Logo slot — swap for an <img> when a tenant logo is configured */}
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white font-bold text-neutral-950">
            {BRAND.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">{BRAND.name}</span>
        </Link>
        <button className="text-neutral-400 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navLinks.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-white text-neutral-950" : "text-neutral-400 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        className="m-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut className="h-[18px] w-[18px]" /> Sign out
      </button>
    </>
  );

  return (
    <div className="light flex min-h-screen bg-neutral-50 text-neutral-900">
      {/* Sidebar — static on desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-neutral-950 text-neutral-300 md:flex">{sidebar}</aside>

      {/* Sidebar — drawer on mobile */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-neutral-950 text-neutral-300 md:hidden">{sidebar}</aside>
        </>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-neutral-200 bg-white px-4 py-3.5 sm:px-6">
          <button className="text-neutral-500 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{title || "Admin"}</h1>
            {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
          </div>

          <div className="ml-auto hidden items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400 lg:flex lg:w-72 xl:w-80">
            <Search className="h-4 w-4" />
            <span className="flex-1">Search…</span>
            <kbd className="rounded border border-neutral-300 px-1.5 text-[11px] text-neutral-500">⌘K</kbd>
          </div>
          <button className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 lg:ml-0" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white">{initials}</div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{userName}</p>
              {userEmail && <p className="text-xs text-neutral-500">{userEmail}</p>}
            </div>
            <ChevronDown className="hidden h-4 w-4 text-neutral-400 sm:block" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
