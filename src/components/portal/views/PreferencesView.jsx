import { useState, useEffect } from "react";
import { AccountPreferences } from "../sections/AccountSection";

export function PreferencesView({ view }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const activityLog = view?.activity ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-border-subtle bg-background p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Your account</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Preferences & Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings, security, and notification preferences.
        </p>
      </div>

      <AccountPreferences />
      
      <div className="rounded-[32px] border border-border-subtle bg-background p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Recent activity</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Account Activity Log</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track all recent actions on your account.</p>
        
        <div className="mt-6 space-y-3">
          {activityLog.length > 0 ? (
            activityLog.map((entry, index) => (
              <div key={entry.id || index} className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-muted p-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">{entry.description}</p>
                </div>
                {entry.when && (
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {mounted
                      ? new Date(entry.when).toLocaleDateString("en-AU")
                      : new Date(entry.when).toISOString().split("T")[0]}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

