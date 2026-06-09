import { getValidAccessToken, fetchAllStravaActivities, shapeActivity, isStrength, isRun } from "../../lib/db";

export default async function handler(req, res) {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: "Not authenticated. Visit /api/auth/login" });
    }

    const raw = await fetchAllStravaActivities(accessToken);

    const runs = [];
    const strength = [];

    for (const a of raw) {
      const shaped = shapeActivity(a);
      if (isRun(shaped.sport_type)) runs.push(shaped);
      else if (isStrength(shaped.sport_type)) strength.push(shaped);
    }

    res.status(200).json({ runs, strength, total: raw.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
