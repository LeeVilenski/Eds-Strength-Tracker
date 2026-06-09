import { saveTokens } from "../../../lib/db";

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect("/?error=strava_denied");
  }

  try {
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.redirect(`/?error=token_exchange_failed`);
    }

    const data = await tokenRes.json();

    await saveTokens({
      athlete_id: data.athlete.id,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });

    res.redirect("/?connected=true");
  } catch (e) {
    res.redirect(`/?error=server_error`);
  }
}
