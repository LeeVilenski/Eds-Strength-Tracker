import { getStoredTokens } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const tokens = await getStoredTokens();
    res.status(200).json({ connected: !!tokens, athlete_id: tokens?.athlete_id || null });
  } catch (e) {
    res.status(500).json({ connected: false, error: e.message });
  }
}
