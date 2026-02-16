/**
 * LoginForm Component
 * Login form with floating inputs and enhanced loading feedback
 */

import { useState } from "react";
import { useRouter } from "next/router";
import { Lock, User } from "lucide-react";
import { FloatingInput } from "./FloatingInput";
import { sanitizeReturnUrl } from "../../lib/auth/auth-utils";

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFocus(fieldName) {
    setFocusedField(fieldName);
  }

  function handleBlur() {
    setFocusedField(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      let response;
      try {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error("Login request timed out. Please check your connection and try again.");
        }
        throw new Error("Unable to connect to server. Please check your connection.");
      }
      clearTimeout(timeoutId);

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.err ?? "Login failed");
      }

      // Token is stored in httpOnly cookie by the API
      // Force a full page reload to ensure cookie is available
      const returnUrl = sanitizeReturnUrl(router.query.from);
      // Use window.location.replace to avoid adding to history
      window.location.replace(returnUrl);
    } catch (err) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-error/40 bg-error/10 p-4 text-sm text-error backdrop-blur-sm animate-shake">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Username Field */}
      <FloatingInput
        type="text"
        name="username"
        label="Username"
        icon={User}
        value={form.username}
        onChange={handleChange}
        onFocus={() => handleFocus("username")}
        onBlur={handleBlur}
        autoComplete="username"
        required
        data-focused={focusedField === "username" ? "true" : "false"}
      />

      {/* Password Field */}
      <FloatingInput
        type="password"
        name="password"
        label="Password"
        icon={Lock}
        value={form.password}
        onChange={handleChange}
        onFocus={() => handleFocus("password")}
        onBlur={handleBlur}
        autoComplete="current-password"
        required
        data-focused={focusedField === "password" ? "true" : "false"}
      />

      {/* Submit Button with Enhanced Loading State */}
      <button
        type="submit"
        disabled={loading}
        aria-label={loading ? "Signing in, please wait" : "Sign in to your account"}
        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-secondary px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100"
      >
        <span className="relative z-10 flex items-center justify-center gap-2.5">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
              <span className="font-medium">Signing in…</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>Sign in</span>
            </>
          )}
        </span>
        {/* Button shine effect - only show when not loading */}
        {!loading && (
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
        )}
      </button>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </form>
  );
}

