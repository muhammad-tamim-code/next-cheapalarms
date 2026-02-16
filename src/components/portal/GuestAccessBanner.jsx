import { Info, X, UserPlus, LogIn, Eye } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "../ui/button";

/**
 * Beautiful guest access banner with brand colors
 * Shows when user is viewing portal via invite token (read-only mode)
 */
export function GuestAccessBanner({ 
  daysRemaining, 
  estimateId,
  onDismiss,
  onCreateAccount,
  onSignIn 
}) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  const handleCreateAccount = () => {
    if (onCreateAccount) {
      onCreateAccount();
    } else {
      // Default: redirect to account creation
      router.push(`/set-password?estimateId=${estimateId}`);
    }
  };

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      // Default: redirect to login (use 'from' param which login page reads)
      router.push(`/login?from=${encodeURIComponent(`/portal?estimateId=${estimateId}`)}`);
    }
  };

  if (!visible) return null;

  return (
    <div className="rounded-[32px] border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6 shadow-[0_25px_80px_rgba(201,83,117,0.12)]">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="rounded-full bg-primary/10 p-3 flex-shrink-0">
          <Info className="h-6 w-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Viewing as Guest
              </h3>
              <p className="mt-2 text-sm text-foreground leading-relaxed">
                You're viewing this estimate with a temporary link. Create an account for full access to accept, reject, upload photos, and manage your installation.
              </p>
              
              {/* Days Remaining Badge */}
              {daysRemaining !== null && daysRemaining >= 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-info-bg border border-info/30">
                  <span className="text-xs font-semibold text-info">
                    {daysRemaining === 0 
                      ? "Expires today" 
                      : daysRemaining === 1 
                        ? "1 day remaining" 
                        : `${daysRemaining} days remaining`}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleCreateAccount}
                  variant="default"
                  className="rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </Button>
                
                <Button
                  onClick={handleSignIn}
                  variant="default"
                  className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>

                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  className="rounded-xl"
                >
                  Continue as Guest
                </Button>
              </div>
            </div>

            {/* Dismiss Button */}
            <Button
              type="button"
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

