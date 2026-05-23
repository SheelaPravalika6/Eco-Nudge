# 🌿 EcoNudge — Carbon Emission Tracker

A full-stack web app to track your carbon footprint, complete eco tasks, and compete on the leaderboard.

## Tech Stack
- **Frontend:** React + Tailwind CSS + Recharts
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT

---

## 🚀 Setup Instructions

### Step 1 — Open the project in VS Code
Unzip and open the `econudge` folder in VS Code.

### Step 2 — Install Backend Dependencies
Open a terminal (Ctrl + `) and run:
```bash
cd server
npm install
```

### Step 3 — Configure Environment Variables
Edit `server/.env`:
```
JWT_SECRET=econudge_super_secret_key_change_this_in_production
PORT=5000
ANTHROPIC_API_KEY=your_key_here   ← Get from console.anthropic.com
```

### Step 4 — Start the Backend
```bash
cd server
npm run dev
```
You should see: `🌿 EcoNudge server running on http://localhost:5000`

### Step 5 — Install Frontend Dependencies
Open a **new terminal tab** and run:
```bash
cd client
npm install
```

### Step 6 — Start the Frontend
```bash
cd client
npm run dev
```
Open http://localhost:5173 in your browser.

---

## 📱 Features
- ✅ User signup/login with JWT auth
- ✅ Log daily activities (transport, food, energy, shopping)
- ✅ CO₂ calculated from real emission factors
- ✅ 14-day trend chart, category donut chart, city comparison bar chart
- ✅ Task board with difficulty filters and points system
- ✅ Weekly leaderboard (emissions + points)
- ✅ AI eco coach powered by Claude API
- ✅ Profile settings & stats
- ✅ Streak tracking
- ✅ Onboarding flow for new users
- ✅ Mobile responsive with bottom nav

---

## 🔑 Getting an Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Create an API key
4. Paste it in `server/.env` as `ANTHROPIC_API_KEY`

The AI suggestions feature won't work without this, but everything else will.

---

## 🚢 Deployment
- **Frontend → Vercel:** Push to GitHub, import on vercel.com
- **Backend → Railway:** Push to GitHub, deploy on railway.app, add .env variables
