# EcoNudge — Full Deployment Guide

## Running Locally (on your laptop)

### Step 1 — Start the backend
```
cd server
npm install
npm run dev
```
You will see: 🌿 EcoNudge server running on port 5000

### Step 2 — Start the frontend (new terminal)
```
cd client
npm install
npm run dev
```
Open http://localhost:5173

That is it for local. No API keys needed. Data saves to server/econudge.db on your laptop.

---

## Deploying to the internet (Railway + Vercel)

### PART 1 — Push to GitHub
1. Create a new repo on github.com (call it econudge)
2. Inside your econudge folder, run:
```
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/YOUR_USERNAME/econudge.git
git push -u origin main
```

---

### PART 2 — Deploy Backend on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo" → select your econudge repo
3. Railway will detect it. When asked for Root Directory, type: server
4. Wait for it to deploy (takes 1-2 minutes)
5. Once deployed, click your service → go to "Variables" tab → add these:

   | Variable     | Value                                              |
   |------------- |----------------------------------------------------|
   | JWT_SECRET   | econudge_super_secret_key_change_this_in_production |
   | PORT         | 5000                                               |
   | DB_PATH      | /app/data/econudge.db                              |

6. Still in Railway, click "Volumes" tab → "Add Volume"
   - Mount Path: /app/data
   - This is the persistent disk — your database will NEVER be wiped again

7. Click "Settings" tab → copy your Railway public URL
   It looks like: https://econudge-production.up.railway.app

8. Go back to Variables → add one more:

   | Variable     | Value                                    |
   |------------- |------------------------------------------|
   | FRONTEND_URL | https://your-app.vercel.app  ← fill this in after step PART 3 |

---

### PART 3 — Deploy Frontend on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "New Project" → import your econudge repo
3. When asked for Root Directory, type: client
4. Under "Environment Variables", add:

   | Variable      | Value                                              |
   |-------------- |----------------------------------------------------|
   | VITE_API_URL  | https://econudge-production.up.railway.app  ← your Railway URL from PART 2 step 7 |

5. Click Deploy. Wait 1-2 minutes.
6. Copy your Vercel URL (looks like https://econudge-abc123.vercel.app)

---

### PART 4 — Final step (link them together)

1. Go back to Railway → your service → Variables
2. Set FRONTEND_URL = https://econudge-abc123.vercel.app  (your Vercel URL from PART 3 step 6)
3. Click "Redeploy"

---

## Done! Your app is now fully live.

- Frontend: https://your-app.vercel.app
- Backend: https://your-app.railway.app
- Database: saved permanently on Railway volume, never wiped on redeploy
- No API keys needed anywhere

