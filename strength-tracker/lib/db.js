import { createPool } from "@vercel/postgres";
const { sql } = createPool({ connectionString: process.env.POSTGRES_URL });

// ---------------------------------------------------------------------------
// DB setup — call once on first deploy (hit /api/setup)
// ---------------------------------------------------------------------------
export async function setupDb() {
  // Stores the single user's Strava tokens
  await sql`
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY DEFAULT 1,
      athlete_id BIGINT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at BIGINT
    );
  `;

  // Stores exercise notes keyed by Strava activity ID
  await sql`
    CREATE TABLE IF NOT EXISTS exercise_notes (
      activity_id BIGINT PRIMARY KEY,
      notes_json TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------
export async function getStoredTokens() {
  const result = await sql`SELECT * FROM auth WHERE id = 1`;
  return result.rows[0] || null;
}

export async function saveTokens({ athlete_id, access_token, refresh_token, expires_at }) {
  await sql`
    INSERT INTO auth (id, athlete_id, access_token, refresh_token, expires_at)
    VALUES (1, ${athlete_id}, ${access_token}, ${refresh_token}, ${expires_at})
    ON CONFLICT (id) DO UPDATE SET
      athlete_id = EXCLUDED.athlete_id,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at
  `;
}

export async function getValidAccessToken() {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  // If token expires in more than 5 minutes, use it as-is
  const nowSecs = Math.floor(Date.now() / 1000);
  if (tokens.expires_at > nowSecs + 300) {
    return tokens.access_token;
  }

  // Otherwise refresh
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();

  await saveTokens({
    athlete_id: tokens.athlete_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  });

  return data.access_token;
}

// ---------------------------------------------------------------------------
// Exercise notes
// ---------------------------------------------------------------------------
export async function getExerciseNotes(activityId) {
  const result = await sql`
    SELECT notes_json FROM exercise_notes WHERE activity_id = ${activityId}
  `;
  if (!result.rows[0]) return null;
  return JSON.parse(result.rows[0].notes_json);
}

export async function getAllExerciseNotes() {
  const result = await sql`SELECT activity_id, notes_json FROM exercise_notes`;
  const map = {};
  for (const row of result.rows) {
    map[row.activity_id] = JSON.parse(row.notes_json);
  }
  return map;
}

export async function saveExerciseNotes(activityId, notes) {
  await sql`
    INSERT INTO exercise_notes (activity_id, notes_json, updated_at)
    VALUES (${activityId}, ${JSON.stringify(notes)}, NOW())
    ON CONFLICT (activity_id) DO UPDATE SET
      notes_json = EXCLUDED.notes_json,
      updated_at = NOW()
  `;
}

// ---------------------------------------------------------------------------
// Strava API helpers
// ---------------------------------------------------------------------------
const STRENGTH_TYPES = new Set([
  "WeightTraining", "Workout", "Crossfit",
  "HighIntensityIntervalTraining", "Yoga", "Pilates", "RockClimbing",
]);
const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun", "Treadmill"]);

export function isStrength(sport_type) { return STRENGTH_TYPES.has(sport_type); }
export function isRun(sport_type) { return RUN_TYPES.has(sport_type); }

export async function fetchAllStravaActivities(accessToken) {
  const activities = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;
    activities.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  return activities;
}

export function shapeActivity(a) {
  return {
    id: String(a.id),
    name: a.name,
    sport_type: a.sport_type || a.type,
    date: a.start_date_local?.slice(0, 10),
    distance: a.distance || 0,
    duration: a.moving_time || 0,
    calories: a.calories || 0,
    effort: a.suffer_score || 0,
    avg_hr: a.average_heartrate || null,
    max_hr: a.max_heartrate || null,
    elevation: a.total_elevation_gain || 0,
  };
}
