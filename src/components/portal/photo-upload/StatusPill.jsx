import { Check } from "lucide-react";

/**
 * Status pill component for product upload status.
 * `required` distinguishes a required line that's still empty (red "Required")
 * from an optional line with no photos yet (muted "Optional").
 *
 * States:
 *   ready   -> green "Ready"
 *   skipped -> muted "Skipped"
 *   pending -> red "Required" if required else muted "Optional"
 */
export function StatusPill({ status, required = false }) {
  if (status === 'ready') {
    return (
      <span className="flex items-center gap-1 px-3 py-1 bg-success-bg text-success text-xs font-semibold rounded-full border border-success/50">
        <Check size={12} strokeWidth={3} /> Ready
      </span>
    );
  }

  if (status === 'skipped') {
    return (
      <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full border border-border-subtle">
        Skipped
      </span>
    );
  }

  if (!required) {
    return (
      <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full border border-border-subtle">
        Optional
      </span>
    );
  }

  return (
    <span className="px-3 py-1 bg-background text-error text-xs font-semibold rounded-full border border-error/50">
      Required
    </span>
  );
}

