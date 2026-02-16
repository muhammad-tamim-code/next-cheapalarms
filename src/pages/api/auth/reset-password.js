import { serialize } from "cookie";
import { WP_API_BASE } from "../../../lib/wp.server";
import { TOKEN_COOKIE } from "../../../lib/wp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const wpBase = process.env.NEXT_PUBLIC_WP_URL || WP_API_BASE;
  if (!wpBase) {
    return res.status(500).json({ ok: false, err: "WP API base not configured" });
  }

  const devHeader = process.env.NODE_ENV === "development" ? { "X-CA-Dev": "1" } : {};

  try {
    const resp = await fetch(`${wpBase}/ca/v1/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...devHeader,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const contentType = resp.headers.get("content-type") || "";
    let body;
    
    if (contentType.includes("application/json")) {
      try {
        const text = await resp.text();
        if (!text) {
          return res.status(resp.status || 500).json({ 
            ok: false, 
            err: "Empty response from server",
          });
        }
        body = JSON.parse(text);
      } catch (jsonError) {
        return res.status(500).json({ 
          ok: false, 
          err: "Invalid response from server",
        });
      }
    } else {
      return res.status(resp.status || 500).json({ 
        ok: false, 
        err: "Server error occurred",
      });
    }

    // If WordPress returned a token (auto-login after password reset),
    // set it as an httpOnly cookie and strip from the response body
    if (body?.ok && body?.token) {
      const cookie = serialize(TOKEN_COOKIE, body.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: body.expiresIn ?? 3600,
      });
      res.setHeader("Set-Cookie", cookie);

      // Strip sensitive token data from client response
      const { token, expiresIn, ...safeBody } = body;
      return res.status(resp.status).json(safeBody);
    }

    return res.status(resp.status).json(body);
  } catch (e) {
    return res.status(500).json({ 
      ok: false, 
      err: e instanceof Error ? e.message : "Failed to connect to server",
    });
  }
}

