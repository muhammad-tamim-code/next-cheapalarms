import { AlertCircle, Mail } from "lucide-react";

/**
 * Friendly error message for expired invite tokens
 * Shows actionable next steps - Contact Support via mailto
 */
export function ExpiredInviteMessage({ estimateId }) {
  const mailtoUrl = `mailto:support@cheapalarms.com.au?subject=${encodeURIComponent(
    `Portal invite link expired${estimateId ? ` - Estimate #${estimateId}` : ""}`
  )}`;

  return (
    <div className="rounded-[32px] border-2 border-warning/50 bg-gradient-to-br from-warning-bg to-warning-bg/80 p-8 shadow-[0_25px_80px_rgba(245,158,11,0.15)]">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-warning-bg p-4">
          <AlertCircle className="h-8 w-8 text-warning" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">Invite Link Expired</h2>
          <p className="mt-2 text-foreground">
            This portal invite link has expired. Invite links are valid for 7 days for security.
          </p>

          <a
            href={mailtoUrl}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-xl hover:bg-primary/90"
          >
            <Mail className="h-5 w-5" />
            Contact Support
          </a>

          <div className="mt-6 rounded-xl border border-border bg-muted p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Need Help?
            </p>
            <p className="text-sm text-foreground">
              If you continue having issues, please contact our support team at{" "}
              <a href="mailto:support@cheapalarms.com.au" className="font-semibold text-primary hover:underline">
                support@cheapalarms.com.au
              </a>
              {estimateId && (
                <>
                  {" "}and mention estimate <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">#{estimateId}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

