# Vercel Deployment — Safeguard staging

| | |
|--|--|
| **Portal** | `https://safeguard-portal.vercel.app` |
| **WordPress API** | `https://skyblue-dolphin-986433.hostingersite.com/wp-json` |
| **Project ID** | `prj_2YThEFwkPT5JnWnu3AKI4M0xam4c` |

---

## Environment variables (Vercel → Production)

See **`vercel.safeguard-staging.env.example`** in this folder (copy/paste into Vercel dashboard).

Redeploy after any env change.

---

## WordPress plugin files to upload (Hostinger)

| File | Purpose |
|------|---------|
| `config/secrets.php` | Credentials + JWT + upload secret + branding |
| `config/instance.php` | `frontend_url` + CORS (from sync script) |

---

## Verification

| Test | URL |
|------|-----|
| WP health | `https://skyblue-dolphin-986433.hostingersite.com/wp-json/ca/v1/health` |
| Portal login | `https://safeguard-portal.vercel.app/login` |
| Admin | `https://safeguard-portal.vercel.app/admin` |

---

Full checklist: `wordpress/wp-content/plugins/cheapalarms-plugin/docs/SAFEGUARD-STAGING-DEPLOY.md`
