"use client";

import * as React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Badge } from "../badge";
import { SidebarContext } from "./context";

function SidebarNavItem({ item, enableNestedNav }) {
  const {
    activeItem,
    onNavChange,
    navigatingTo,
    variant,
    expandedItems,
    setExpandedItems,
  } = React.useContext(SidebarContext);

  const Icon = item.icon;
  const isActive = navigatingTo
    ? navigatingTo === item.href
    : activeItem === item.href;
  const hasSubmenu = enableNestedNav && item.submenu && item.submenu.length > 0;
  const isExpanded = expandedItems.has(item.href);
  const isNavigating = navigatingTo === item.href

  const itemClasses = {
    minimal: cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-fast ease-standard relative group",
      isActive
        ? "bg-primary/10 text-primary border-l-2 border-primary"
        : "text-muted-foreground hover:bg-state-hover-bg hover:text-foreground"
    ),
    glass: cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-fast ease-standard backdrop-blur-sm relative group",
      isActive
        ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
        : "text-muted-foreground hover:bg-surface/60 hover:text-foreground"
    ),
    gradient: cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-fast ease-standard relative group",
      isActive
        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md"
        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
    ),
    compact: cn(
      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-base font-medium transition-all duration-fast ease-standard relative group",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-state-hover-bg hover:text-foreground"
    ),
    elevated: cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-all duration-fast ease-standard relative group",
      isActive
        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
        : "text-muted-foreground hover:bg-state-hover-bg hover:text-foreground hover:shadow-sm"
    ),
    split: cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-fast ease-standard relative group",
      isActive
        ? "bg-primary/10 text-primary border-l-4 border-primary"
        : "text-muted-foreground hover:bg-state-hover-bg hover:text-foreground"
    ),
  };

  const handleClick = React.useCallback(
    (e) => {
      if (hasSubmenu) {
        setExpandedItems((prev) => {
          const next = new Set(prev);
          if (next.has(item.href)) {
            next.delete(item.href);
          } else {
            next.add(item.href);
          }
          return next;
        });
      } else {
        if (isActive || isNavigating) {
          return;
        }
        onNavChange?.(item.href);
      }
    },
    [hasSubmenu, item.href, isActive, isNavigating, onNavChange, setExpandedItems]
  );

  const handleKeyDown = React.useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick(e);
      }
      if (e.key === "Escape" && hasSubmenu && isExpanded) {
        e.preventDefault();
        setExpandedItems((prev) => {
          const next = new Set(prev);
          next.delete(item.href);
          return next;
        });
      }
    },
    [handleClick, hasSubmenu, isExpanded, item.href, setExpandedItems]
  );

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={itemClasses[variant]}
        disabled={isNavigating}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={hasSubmenu ? isExpanded : undefined}
        style={{
          cursor: isNavigating ? "wait" : "pointer",
          opacity: isNavigating ? 0.7 : 1,
        }}
        onMouseDown={(e) => {
          if (isNavigating) {
            e.preventDefault();
            return;
          }
          const button = e.currentTarget;
          const ripple = document.createElement("span");
          const rect = button.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = e.clientX - rect.left - size / 2;
          const y = e.clientY - rect.top - size / 2;
          ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            animation: ripple 0.6s ease-out;
            z-index: 1;
          `;
          button.style.position = "relative";
          button.style.overflow = "hidden";
          button.appendChild(ripple);
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (ripple.parentNode) {
                ripple.remove();
              }
            }, 600);
          });
        }}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-transform duration-fast ease-standard",
            isActive && variant === "gradient" && "text-primary-foreground",
            isActive && variant !== "gradient" && "text-primary"
          )}
        />
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge && (
          <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
            {item.badge}
          </Badge>
        )}
        {hasSubmenu && (
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-transform duration-fast ease-standard",
              isExpanded && "rotate-180"
            )}
          />
        )}
        {isActive && variant === "split" && (
          <ChevronRight className="h-5 w-5 text-primary" />
        )}
      </button>
      {hasSubmenu && isExpanded && (
        <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
          {item.submenu.map((subItem) => {
            const SubIcon = subItem.icon;
            const isSubActive = navigatingTo
              ? navigatingTo === subItem.href
              : activeItem === subItem.href;
            const isSubNavigating = navigatingTo === subItem.href;
            return (
              <button
                key={subItem.href}
                type="button"
                onClick={() => onNavChange?.(subItem.href)}
                disabled={isSubNavigating}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-base font-medium transition-all duration-fast ease-standard",
                  isSubActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-state-hover-bg hover:text-foreground",
                  isSubNavigating && "opacity-70 cursor-wait"
                )}
              >
                {SubIcon && <SubIcon className="h-4 w-4" />}
                <span className="flex-1 text-left">{subItem.label}</span>
                {subItem.badge && (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 px-1 text-xs"
                  >
                    {subItem.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

SidebarNavItem.displayName = "SidebarNavItem";

export function SidebarNav({
  navItems,
  enableRecentItems,
  enablePinnedItems,
  enableNestedNav,
}) {
  const {
    activeItem,
    onNavChange,
    pinnedItems,
    onPinItem,
    recentItems,
    variant,
    expandedItems,
    setExpandedItems,
  } = React.useContext(SidebarContext);

  const pinnedNavItems = enablePinnedItems
    ? navItems.filter((item) => pinnedItems.includes(item.href))
    : [];
  const recentNavItems = enableRecentItems
    ? recentItems.filter((item) => navItems.some((nav) => nav.href === item.href))
    : [];

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {enablePinnedItems && pinnedNavItems.length > 0 && (
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pinned
          </p>
          {pinnedNavItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              enableNestedNav={enableNestedNav}
            />
          ))}
        </div>
      )}
      {enableRecentItems && recentNavItems.length > 0 && (
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recent
          </p>
          {recentNavItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              enableNestedNav={enableNestedNav}
            />
          ))}
        </div>
      )}
      <div>
        {(enablePinnedItems || enableRecentItems) && (
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation
          </p>
        )}
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            enableNestedNav={enableNestedNav}
          />
        ))}
      </div>
      {navItems.length === 0 && (
        <div className="px-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">No results found</p>
        </div>
      )}
    </nav>
  );
}

SidebarNav.displayName = "SidebarNav";
