# Deploying DocuMind (Free Tier)

**Frontend** on Vercel (free) | **Backend** on Render (free) | **Database** on Supabase (free)

---

## Prerequisites

- A GitHub account with this repo pushed to it
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free)

---

## Step 1 — Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project** — pick a name and set a database password (save it!)
3. Once the project is created, go to **Settings → Database**
4. Copy the **Connection string (URI)** — it looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. Enable pgvector: go to **SQL Editor** and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

> Save the connection string — you'll need it for the backend.

---

## Step 2 — Backend (Render)

1. Go to [render.com](https://render.com) and sign up (free, link your GitHub)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure the service:
   - **Name**: `documind-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Plan**: `Free`
5. Add **Environment Variables** (click "Add Environment Variable"):
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `DATABASE_URL` | Your Supabase connection string from Step 1 |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` (update after Step 3) |
6. Click **Create Web Service**
7. Wait for the build (~5–10 min, it downloads the embedding model)
8. Once deployed, your backend URL will be something like:
   ```
   https://documind-api.onrender.com
   ```
   Test it: visit `https://documind-api.onrender.com/health` — you should see `{"status":"ok"}`

> **Note**: Render free tier spins down after 15 min of inactivity. First request after idle takes ~30–60 seconds to cold-start.

---

## Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up (free, link your GitHub)
2. Click **Add New → Project**
3. Import your GitHub repo
4. Vercel will auto-detect the config from `vercel.json`. Verify:
   - **Framework**: Vite
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
5. Add **Environment Variable**:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | Your Render backend URL (e.g. `https://documind-api.onrender.com`) |
6. Click **Deploy**
7. Once deployed, copy your Vercel URL (e.g. `https://your-app.vercel.app`)

---

## Step 4 — Connect Frontend to Backend (CORS)

1. Go back to **Render → your service → Environment**
2. Update `CORS_ORIGINS` to your actual Vercel URL:
   ```
   https://your-app.vercel.app
   ```
3. Render will redeploy automatically

---

## Done!

Your app is now live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://documind-api.onrender.com`
- **Database**: Hosted on Supabase

---

## Free Tier Limits

| Service | Limit |
|---------|-------|
| **Vercel** (frontend) | 100 GB bandwidth/month, unlimited static deploys |
| **Render** (backend) | 750 hrs/month, spins down after 15 min idle, 512 MB RAM |
| **Supabase** (database) | 500 MB storage, 2 GB bandwidth, 50K monthly active users |
| **Gemini API** | 15 RPM (requests/min), 1M tokens/day on free tier |

---

## Troubleshooting

### Backend returns 500 / can't connect to database
- Double-check the Supabase connection string in Render env vars
- Make sure you ran `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL Editor

### CORS errors in browser console
- Make sure `CORS_ORIGINS` in Render matches your exact Vercel URL (including `https://`)
- Redeploy the Render service after changing env vars

### Slow first load
- Render free tier cold-starts take 30–60 seconds — this is normal
- Subsequent requests are fast while the service is warm

### File uploads not persisting after Render redeploy
- Render free tier has an ephemeral filesystem — uploaded files are lost on redeploy
- For persistent file storage, consider upgrading to Render paid tier or using cloud storage (S3, Supabase Storage)
