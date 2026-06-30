/**
 * LoginForm — standard split-card login (username/password + optional forgot password)
 */

import { useState } from "react";
import { useRouter } from "next/router";
import { Lock, User, Mail } from "lucide-react";
import { resolvePostLoginDestination } from "../../lib/auth/auth-utils";
import { BRAND } from "../../config/brand";

function AuthField({ type, name, label, icon: Icon, value, onChange, autoComplete, required }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        placeholder={label}
        className="w-full rounded-full border-0 bg-muted/60 py-3.5 pl-12 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:bg-muted focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

export function LoginForm({ showSwitchHint = false }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [remember, setRemember] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response;
      try {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            remember,
          }),
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Login request timed out. Please check your connection and try again.");
        }
        throw new Error("Unable to connect to server. Please check your connection.");
      }
      clearTimeout(timeoutId);

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.err ?? "Login failed");
      }

      const destination = resolvePostLoginDestination(result.user ?? {}, router.query.from);
      if (!destination) {
        throw new Error("This account does not have admin access. Use your staff login email.");
      }

      window.location.replace(destination);
    } catch (err) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.err || json?.error || "Could not send reset email.");
      }
      setSuccess("If an account exists for that email, we sent a reset link.");
      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to send reset email.");
      setLoading(false);
    }
  }

  if (mode === "forgot") {
    return (
      <div className="mx-auto w-full max-w-sm space-y-6">
        <header className="space-y-1 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Account</p>
          <h1 className="text-xl font-bold text-foreground">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a link to set a new password.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-error/40 bg-error-bg p-3 text-sm text-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-success/30 bg-success-bg p-3 text-sm text-success" role="status">
            {success}
          </div>
        )}

        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <AuthField
            type="email"
            name="email"
            label="Email address"
            icon={Mail}
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-primary to-secondary py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccess(null);
          }}
          className="w-full text-center text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <header className="space-y-1 text-center md:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">User login</p>
        <h1 className="sr-only">Sign in to {BRAND.name}</h1>
      </header>

      {showSwitchHint && (
        <div className="rounded-xl border border-info/30 bg-info-bg p-3 text-sm text-foreground" role="status">
          You&apos;re signed in as a customer in this browser. Enter your staff email below to open the admin dashboard.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-error/40 bg-error-bg p-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <AuthField
          type="text"
          name="username"
          label="Username or email"
          icon={User}
          value={form.username}
          onChange={handleChange}
          autoComplete="username"
          required
        />
        <AuthField
          type="password"
          name="password"
          label="Password"
          icon={Lock}
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between gap-4 px-1 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded-full border-border text-primary focus:ring-primary/30"
            />
            <span>Remember me</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError(null);
            }}
            className="font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-label={loading ? "Signing in, please wait" : "Sign in"}
          className="w-full rounded-full bg-gradient-to-r from-primary to-secondary py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in…
            </span>
          ) : (
            "Login"
          )}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground md:text-left">
        Customer? Use the link from your quote email to access your portal.
      </p>
    </div>
  );
}
