# TravelMate — Vercel Deployment Guide

Backend (Render): `https://travelmate-backend-dzpq.onrender.com`
Frontend repo path: `client/`

---

## 1. One-time Vercel project setup

Push the repo to GitHub, then in the Vercel dashboard:

1. Click **Add New → Project** and import the GitHub repo.
2. **Root Directory:** set to `client` (this is the Vite app).
3. **Framework Preset:** Vite (auto-detected).
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Install Command:** `npm install`
7. **Node.js Version:** 22.x or 24.x.

---

## 2. Environment Variables (Vercel → Settings → Environment Variables)

Add these for **Production, Preview, and Development** environments:

| Key | Value |
|-----|-------|
| `VITE_APP_URL` | `https://travelmate-backend-dzpq.onrender.com` |
| `VITE_PAYMENT_URL` | `https://travelmate-backend-dzpq.onrender.com/api/payment` |
| `VITE_RAZORPAY_KEY` | `rzp_test_SjDi1vvLhVdIAZ` (replace with live key for prod) |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyDOuN0bDatqXI5Lh-JYmPoYG7YnGN3nDZI` |

`VITE_*` vars are exposed in the client bundle. Restrict the Google Maps key in Google Cloud Console by HTTP referrer to your Vercel domain.

---

## 3. Backend (Render) CORS — must include the Vercel URL

On your Render backend, add the deployed Vercel domains to the CORS allowlist, for example:

```
https://your-app.vercel.app
https://your-app-*.vercel.app
```

Otherwise the browser will block all API calls.

---

## 4. Deploy

**Option A — Git push (recommended):**
```bash
git add .
git commit -m "chore: production-ready for Vercel"
git push origin main
```
Vercel auto-builds on push.

**Option B — Vercel CLI:**
```bash
npm i -g vercel
cd client
vercel --prod
```

---

## 5. Files that make this production-ready

| File | Purpose |
|------|---------|
| `vercel.json` | SPA rewrites (so `/find-ride`, `/login`, etc. don't 404 on refresh), long-cache assets, security headers (HSTS, X-Frame-Options, Referrer-Policy). |
| `vite.config.js` | Production build settings — `dist/` output, sourcemaps off, oxc minifier, ES2020 target. |
| `.env.production` | Build-time env vars used when running `vite build` (Vercel inherits its dashboard vars but this is the local fallback). |
| `.env.development` | Local dev vars (points to `localhost:5000`). |
| `index.html` | SEO, Open Graph, Twitter card, theme-color, preconnect to backend + Google fonts + Google Maps. |
| `src/services/api.js` | Reads `VITE_APP_URL` with prod URL fallback. |

---

## 6. Post-deploy smoke test

After the first deploy completes, hit the live URL and verify:

1. `/` (Find Ride) loads.
2. Refresh on `/find-ride` and `/login` — no 404.
3. Open DevTools → Network — first API call should hit `travelmate-backend-dzpq.onrender.com`, not localhost.
4. Razorpay checkout opens on a plan page (note: free Render dynos cold-start in ~15–30s — first call may be slow).
5. Google Maps panel renders without console errors.

---

## 7. Common issues

| Symptom | Fix |
|---------|-----|
| Hard refresh shows 404 on a subroute | `vercel.json` rewrites missing — confirm it's in the deployed root. |
| API calls fail with CORS error | Add Vercel domain to backend CORS allowlist on Render. |
| Google Maps "RefererNotAllowedMapError" | In Google Cloud Console, add your `*.vercel.app` domain to the API key's allowed referrers. |
| Cold-start delay on first API call | Expected on Render free tier — preconnect tag in `index.html` warms the connection. |
| Razorpay "key not found" | Set `VITE_RAZORPAY_KEY` in Vercel env vars and redeploy. |
