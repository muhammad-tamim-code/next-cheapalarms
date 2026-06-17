import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export function LoginModal({ open, onClose, email, estimateId, onLoginSuccess }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: email || "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState(email || "");
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetKey, setResetKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.err || json.error || "Login failed");
      }

      // Token is set as httpOnly cookie by the server
      // Call success callback or redirect
      if (onLoginSuccess) {
        onLoginSuccess(json);
      } else if (estimateId) {
        router.push(`/portal?estimateId=${estimateId}`);
      } else {
        router.push("/portal");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setForgotPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.err || json.error || "Failed to send password reset email");
      }

      setForgotPasswordSent(true);
    } catch (err) {
      setError(err.message || "Failed to send password reset email");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!resetKey || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setResettingPassword(true);

    try {
      // First, we need to get the login/username from the email
      // Let's check the account to get the username
      const checkRes = await fetch("/api/auth/check-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const checkJson = await checkRes.json();

      if (!checkRes.ok || !checkJson.ok || !checkJson.user) {
        throw new Error("Could not find account. Please request a new reset link.");
      }

      const userLogin = checkJson.user.login;

      // Decode reset key if needed
      let decodedKey = resetKey;
      try {
        decodedKey = decodeURIComponent(resetKey);
      } catch {
        // Already decoded, use as-is
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: decodedKey,
          login: userLogin,
          password: newPassword,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.err || json.error || "Failed to reset password");
      }

      // Token is set as httpOnly cookie by the server - no need to set client-side cookie

      // Success! Close modal and redirect
      if (onLoginSuccess) {
        onLoginSuccess(json);
      } else if (estimateId) {
        router.push(`/portal?estimateId=${estimateId}`);
      } else {
        router.push("/portal");
      }
    } catch (err) {
      setError(err.message || "Failed to reset password. Please check your reset key and try again.");
      setResettingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You Already Have an Account</CardTitle>
          <CardDescription>
            Please log in to view your estimate, or reset your password if you&apos;ve forgotten it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Email or Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your@email.com"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Log In"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {!forgotPasswordSent ? (
                // Step 1: Request reset link
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                      {forgotPasswordLoading ? "Sending..." : "Send Password Reset Link"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setError("");
                      }}
                    >
                      Back to Login
                    </Button>
                  </div>
                </form>
              ) : (
                // Step 2: Reset password with key from email
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                    Password reset email sent! Enter the reset key from your email below to set a new password.
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="reset-key" className="text-sm font-medium text-foreground">
                      Reset Key (from email)
                    </label>
                    <input
                      id="reset-key"
                      type="text"
                      value={resetKey}
                      onChange={(e) => setResetKey(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Paste reset key from email"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Check your email for the reset link. Copy the &quot;key&quot; parameter from the URL.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      disabled={resettingPassword}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Confirm your password"
                      required
                      minLength={8}
                      disabled={resettingPassword}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button type="submit" className="w-full" disabled={resettingPassword}>
                      {resettingPassword ? "Resetting Password..." : "Reset Password"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setForgotPasswordSent(false);
                        setResetKey("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setError("");
                      }}
                    >
                      Request New Reset Link
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordSent(false);
                        setResetKey("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setError("");
                      }}
                    >
                      Back to Login
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

