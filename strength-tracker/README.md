# Upper Body Tracker

A personal training dashboard that pulls your full Strava history and lets you add
exercise breakdowns to strength sessions. Everything stored in a database — no
50-activity limit, no data loss.

---

## Stack

- **Next.js** on Vercel (free hobby tier is fine)
- **Vercel Postgres** for storing tokens and exercise notes
- **Strava API** for all activity data
- **Anthropic API** for the AI coach insight

---

## Setup (30-ish minutes)

### 1. Create a Strava API app

1. Go to https://www.strava.com/settings/api
2. Create an application (name it anything, e.g. "My Strength Tracker")
3. Set **Authorization Callback Domain** to `localhost` for now (you'll update it after deploying)
4. Copy your **Client ID** and **Client Secret**

### 2. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel login
vercel                  # follow prompts, deploy from this folder
```

Note the URL Vercel gives you (e.g. `https://strength-tracker-abc.vercel.app`).

### 3. Add Vercel Postgres

1. In the Vercel dashboard → your project → **Storage** tab
2. Click **Create Database** → Postgres
3. Vercel automatically adds the `POSTGRES_*` environment variables to your project

### 4. Set environment variables in Vercel

In your Vercel project → **Settings** → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `STRAVA_CLIENT_ID` | From step 1 |
| `STRAVA_CLIENT_SECRET` | From step 1 |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL, e.g. `https://strength-tracker-abc.vercel.app` |
| `ANTHROPIC_API_KEY` | From https://console.anthropic.com |
| `SESSION_SECRET` | Any long random string (run `openssl rand -hex 32`) |

Then redeploy: `vercel --prod`

### 5. Update Strava callback URL

Go back to https://www.strava.com/settings/api and update:
- **Authorization Callback Domain** → your Vercel domain (e.g. `strength-tracker-abc.vercel.app`)

### 6. Set up the database

Visit: `https://your-app.vercel.app/api/setup`

This creates the two tables. You should see `{"ok":true}`. Only needs doing once.

### 7. Connect your Strava account

Visit your app and click **Connect with Strava**. Authorise it.
It will redirect back and start loading all your activities.

---

## Local development

```bash
cp .env.example .env.local
# Fill in .env.local with your values
# Copy POSTGRES_* vars from Vercel dashboard → Storage → your DB → .env.local tab

npm install
npm run dev
```

Then visit http://localhost:3000

---

## How it works

- **Strava OAuth**: your Forerunner syncs to Strava as normal. This app authenticates
  once with OAuth and stores your tokens securely server-side. Tokens auto-refresh.

- **All history**: unlike the in-Claude version, this fetches every page of your
  Strava activity history — runs and strength sessions going back as far as Strava has.

- **Exercise notes**: when a strength session appears, tap "add exercise breakdown"
  to log reps, sets etc. These save to Postgres (permanent, not browser-only).

- **Activity types that count as strength**: WeightTraining, Workout, Crossfit,
  HighIntensityIntervalTraining, Yoga, Pilates, RockClimbing. Record on your
  Forerunner as "Workout" or "Strength Training" and it'll be picked up.

---

## What it doesn't do

- It doesn't write back to Strava — read-only access only
- It doesn't show exercise-level rep data from Garmin (Strava's API doesn't expose that)
- It's single-user (built for your personal use, not multi-tenant)
