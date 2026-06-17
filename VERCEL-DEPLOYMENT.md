# Vercel Deployment Guide - Next.js Portal

Portal host: **`portal.cheapalarms.com.au`**  
WordPress API: **`https://cheapalarms.com.au/wp-json`**

---

## Environment variables (Vercel)

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_WP_URL` | `https://cheapalarms.com.au/wp-json` |
| `NEXT_PUBLIC_GHL_LOCATION_ID` | Your GHL location ID |
| `NODE_ENV` | `production` |

Set in: **Project → Settings → Environment Variables** (Production). Redeploy after changes.

Local reference: `next-app/.env.production`

---

## Custom domain

1. Vercel → Project → Settings → Domains  
2. Add: `portal.cheapalarms.com.au`  
3. DNS: CNAME `portal` → `cname.vercel-dns.com`  
4. Wait for SSL (5–60 min)

---

## WordPress plugin CORS (on `cheapalarms.com.au`)

Edit `config/instance.php` or `config/secrets.php` on the server:

```php
'upload_allowed_origins' => [
    'https://cheapalarms.com.au',
    'https://portal.cheapalarms.com.au',
],
'api_allowed_origins' => [
    'https://cheapalarms.com.au',
    'https://portal.cheapalarms.com.au',
],
'frontend_url' => 'https://portal.cheapalarms.com.au',
```

See `PRODUCTION-CONFIG-CHECKLIST.md` in the plugin folder.

---

## Testing

| Test | URL |
|------|-----|
| WP health | `https://cheapalarms.com.au/wp-json/ca/v1/health` |
| Portal login | `https://portal.cheapalarms.com.au/login` |
| Admin | `https://portal.cheapalarms.com.au/admin` |

In browser DevTools → Network, API calls from the portal should proxy to `cheapalarms.com.au/wp-json/` (server-side). No CORS errors on login or photo upload.

---

## Checklist

- [ ] WordPress live on `cheapalarms.com.au` with plugin + secrets
- [ ] `NEXT_PUBLIC_WP_URL` set on Vercel
- [ ] `portal.cheapalarms.com.au` DNS + SSL
- [ ] Plugin `frontend_url` + CORS updated
- [ ] Stripe / Xero redirect URLs updated
- [ ] Login + portal smoke test passed
