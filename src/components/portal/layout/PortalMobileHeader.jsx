import Link from "next/link";

import { ChevronDown, Menu, Shield } from "lucide-react";

import { BRAND } from "../../../config/brand";



export function PortalMobileHeader({ onMenuClick, onPreferencesClick }) {

  return (

    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">

      <button

        type="button"

        onClick={onMenuClick}

        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground"

        aria-label="Open menu"

      >

        <Menu className="h-5 w-5" />

      </button>



      <div className="flex min-w-0 flex-1 items-center gap-2">

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">

          <Shield className="h-4 w-4" />

        </span>

        <span className="truncate text-sm font-semibold text-foreground">{BRAND.name}</span>

      </div>



      {onPreferencesClick ? (

        <button

          type="button"

          onClick={onPreferencesClick}

          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground"

        >

          Account

          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />

        </button>

      ) : (

        <Link

          href="/portal?section=preferences"

          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground"

        >

          Account

          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />

        </Link>

      )}

    </header>

  );

}

