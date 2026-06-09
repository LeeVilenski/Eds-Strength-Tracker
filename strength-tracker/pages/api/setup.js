import { setupDb } from "../../lib/db";

export default async function handler(req, res) {
  try {
    await setupDb();
    res.status(200).json({ ok: true, message: "Database tables created." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
