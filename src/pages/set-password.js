import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { BRAND } from "../config/brand";

export default function SetPasswordPage() {
  const router = useRouter();
  const { key, login, estimateId } = router.query;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyValid, setKeyValid] = useState(null);
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState("");

  const resetKey = Array.isArray(key) ? key[0] : key;
  const userLogin = Array.isArray(login) ? login[0] : login;

  useEffect(() => {
    if (!router.isReady || !resetKey || !userLogin) return;
    let cancelled = false;
    setKeyValidating(true);
    setKeyError("");
    fetch("/api/auth/validate-reset-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: resetKey, login: userLogin }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setKeyValidating(false);
        if (json?.ok) {
          setKeyValid(true);
        } else {
          setKeyValid(false);
          setKeyError(json?.error || json?.err || json?.message || "This password reset link is invalid or has expired.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setKeyValidating(false);
        setKeyValid(false);
        setKeyError(err?.message || "Failed to validate reset link.");
      });
    return () => { cancelled = true; };
  }, [router.isReady, resetKey, userLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Ensure we have key and login from query params
      const resetKey = Array.isArray(key) ? key[0] : key;
      const userLogin = Array.isArray(login) ? login[0] : login;
      const estId = Array.isArray(estimateId) ? estimateId[0] : estimateId;

      if (!resetKey || !userLogin) {
        throw new Error("Missing reset key or login. Please use the link from your email.");
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          key: resetKey, 
          login: userLogin, 
          password,
          estimateId: estId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.err || json.error || "Failed to reset password");
      }

      // Token is stored in httpOnly cookie by the API
      // No need to store in localStorage or set cookie manually

      // Redirect to portal
      if (estId) {
        router.push(`/portal?estimateId=${estId}`);
      } else {
        router.push("/portal");
      }
    } catch (err) {
      setError(err.message || "Failed to reset password");
      setLoading(false);
    }
  };

  // Wait for router to be ready before checking query params
  if (!router.isReady) {
    return (
      <>
        <Head>
          <title>Set Your Password - {BRAND.name}</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6 border border-border">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!resetKey || !userLogin) {
    return (
      <>
        <Head>
          <title>Set Your Password - {BRAND.name}</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6 border border-border">
            <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Link</h1>
            <p className="text-muted-foreground mb-6">This password reset link is invalid or has expired.</p>
            <button
              type="button"
              onClick={() => router.push("/portal")}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg shadow-lg transition-all hover:opacity-90"
            >
              Go to Portal
            </button>
          </div>
        </div>
      </>
    );
  }

  if (keyValidating || keyValid === null) {
    return (
      <>
        <Head>
          <title>Set Your Password - {BRAND.name}</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6 border border-border">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
              <p className="mt-4 text-muted-foreground">Validating reset link...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (keyValid === false) {
    return (
      <>
        <Head>
          <title>Set Your Password - {BRAND.name}</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-muted p-4">
          <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6 border border-border">
            <h1 className="text-2xl font-bold text-foreground mb-4">Invalid or Expired Link</h1>
            <p className="text-muted-foreground mb-6">{keyError}</p>
            <button
              type="button"
              onClick={() => router.push("/portal")}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg shadow-lg transition-all hover:opacity-90"
            >
              Go to Portal
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Set Your Password - {BRAND.name}</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-6 border border-border">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Set Your Password</h1>
            <p className="text-muted-foreground">Create a secure password for your {BRAND.name} portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error-bg border border-error/30 p-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-all"
                placeholder="At least 8 characters"
                disabled={loading}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-all"
                placeholder="Confirm your password"
                disabled={loading}
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg shadow-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Setting Password..." : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
