import { serialize } from "cookie";
import { authenticate } from "../../../lib/wp.server";
import { TOKEN_COOKIE } from "../../../lib/wp";
import { API_TIMEOUT } from "../../../lib/api/constants";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, err: "Method not allowed" });
  }

  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({
      ok: false,
      err: "Username and password are required.",
    });
  }

  try {
    // Add timeout to prevent hanging (using API_TIMEOUT constant)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Login request timed out. Please check your connection and try again.")), API_TIMEOUT);
    });

    const result = await Promise.race([
      authenticate({ username, password }),
      timeoutPromise,
    ]);

    const cookie = serialize(TOKEN_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: result.expiresIn ?? 3600,
    });

    res.setHeader("Set-Cookie", cookie);

    return res.status(200).json({
      ok: true,
      // Token is already set as httpOnly cookie - do not expose in response body
      user: result.user,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    return res.status(401).json({
      ok: false,
      err: error instanceof Error ? error.message : "Authentication failed",
    });
  }
}

