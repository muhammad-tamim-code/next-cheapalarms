import Image from "next/image";
import { ExternalLink } from "lucide-react";

import { buildGhlEstimateEditUrl } from "../../lib/admin/ghl-links";

/**
 * Opens the estimate in GHL Payments editor (correct v2 URL + location id).
 */
export function ViewInGhlButton({ estimateId, locationId, estimate, className = "" }) {
  const href = buildGhlEstimateEditUrl(estimateId, locationId, estimate);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2",
        "text-foreground transition hover:bg-muted",
        className,
      ].join(" ")}
    >
      <Image src="/brand/ghl-logo.png" alt="" width={18} height={18} className="shrink-0 rounded-sm" />
      <span>View in GHL</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </a>
  );
}
