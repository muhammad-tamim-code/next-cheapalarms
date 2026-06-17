import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { getRouteMetadata } from "../../../lib/admin/route-metadata";

export default function AdminLayout({ title: titleProp, authContext, children }) {
  const router = useRouter();
  // CRITICAL: Lifted state to AdminLayout so both Sidebar and Topbar update immediately
  const [navigatingTo, setNavigatingTo] = useState(null);

  // Derive sidebar user from auth context (falls back to placeholder if not provided)
  const sidebarUser = useMemo(() => {
    if (!authContext) return undefined; // let UISidebar use its default
    return {
      name: authContext.displayName || authContext.email || "User",
      email: authContext.email || "",
      avatar: authContext.avatar || null,
      status: "online",
    };
  }, [authContext]);

  // Sidebar action handlers
  const handleProfileClick = useCallback(() => {
    router.push("/admin/profile");
  }, [router]);

  const handleSettingsClick = useCallback(() => {
    router.push("/admin/settings");
  }, [router]);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Even if logout API fails, redirect to login
    }
    router.push("/login");
  }, [router]);

  // Track router events to clear navigatingTo when navigation completes
  useEffect(() => {
    const handleRouteChangeComplete = () => {
      setNavigatingTo(null);
    };

    const handleRouteChangeError = () => {
      setNavigatingTo(null);
    };

    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);

  // Determine header title and icon with priority:
  // 1. titleProp (from page component) - highest priority
  // 2. navigatingTo (optimistic update during navigation)
  // 3. current route (fallback)
  const headerMetadata = useMemo(() => {
    // Priority 1: Use title prop if provided (for dynamic routes like "Estimate #123")
    if (titleProp) {
      // Get icon from current route metadata
      const currentMetadata = getRouteMetadata(router.pathname, router.asPath);
      return {
        title: titleProp,
        icon: currentMetadata.icon,
        isNavigating: !!navigatingTo,
      };
    }

    // Priority 2: Use optimistic route metadata when navigating
    if (navigatingTo) {
      // Extract pathname from navigating URL
      const navigatingPath = navigatingTo.split('?')[0];
      // Try to match the navigating route
      const navigatingMetadata = getRouteMetadata(navigatingPath, navigatingTo);
      return {
        title: navigatingMetadata.title,
        icon: navigatingMetadata.icon,
        isNavigating: true,
      };
    }

    // Priority 3: Use current route metadata
    const currentMetadata = getRouteMetadata(router.pathname, router.asPath);
    return {
      title: currentMetadata.title,
      icon: currentMetadata.icon,
      isNavigating: false,
    };
  }, [titleProp, navigatingTo, router.pathname, router.asPath]);

  return (
    <main className="light bg-muted text-foreground min-h-screen">
      {/* Force light theme - portals don't support theme switching */}
      <div className="flex min-h-screen">
        <Sidebar
          navigatingTo={navigatingTo}
          setNavigatingTo={setNavigatingTo}
          user={sidebarUser}
          authContext={authContext}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
          onSignOutClick={handleSignOut}
        />
        <div className="flex-1 flex flex-col relative">
          <Topbar
            title={headerMetadata.title}
            icon={headerMetadata.icon}
            isNavigating={headerMetadata.isNavigating}
          />
          <div className="flex-1 px-4 py-8 sm:px-6 lg:px-10 relative">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}


