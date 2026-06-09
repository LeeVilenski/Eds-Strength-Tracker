import { getAllExerciseNotes, saveExerciseNotes } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const notes = await getAllExerciseNotes();
      res.status(200).json({ notes });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    try {
      const { activity_id, notes } = req.body;
      if (!activity_id || !notes) {
        return res.status(400).json({ error: "activity_id and notes required" });
      }
      await saveExerciseNotes(activity_id, notes);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
